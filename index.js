const { app, BrowserWindow, shell } = require('electron');
const { exec } = require('child_process');
const express = require('express');
const expressApp = express();
const path = require("path");
const fs = require("fs");
const formidableMiddleware = require("express-formidable");
const fechas = require("./src/resources/Fechas");
const axios = require("axios");

var mainWindow = null;
var bufferImpresion = "";

const uuidv4 =()=> {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

const GUID = uuidv4();

let conf = null;
try{
    let ret = fs.readFileSync( path.join(__dirname, "conf.json"), "utf8" );
    conf = JSON.parse( ret );
}catch(err){

}

const createWindow = async () => {
    let instanciaUnica = false;
    try{
        //obtengo el GUID de la instancia que esta utilizando el puerto 3000
        let verificarGuid = await axios("http://localhost:3000/guid", {timeout: 200});
        instanciaUnica = (verificarGuid.data == GUID);
    }catch(err){
        instanciaUnica = true;
    }finally{
        if( instanciaUnica ){
            mainWindow = new BrowserWindow({
                width: 1400,
                height: 1050,
                icon: __dirname + '/src/resources/icono6.png',
            })
        
            mainWindow.loadURL('http://localhost:3000/');
            if(conf && conf["env"] && conf["env"].indexOf("dev") > -1) mainWindow.webContents.openDevTools();
            mainWindow.on("closed", ()=> mainWindow = null);
        }else{
            app.quit();
        }
    }
}

app.whenReady().then(()=>{
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

//middlewares
expressApp.use(formidableMiddleware())

// Configura EJS como motor de vistas
expressApp.set('view engine', 'ejs');

// Establece la ubicación de tus archivos de vistas EJS
expressApp.set('views', __dirname + '/views');

//archivos estaticos servidos
expressApp.use("/scripts", express.static(__dirname + "/src/scripts"));
expressApp.use("/styles", express.static(__dirname + "/src/styles"));
expressApp.use("/resources", express.static(__dirname + "/src/resources"));
expressApp.use("/printables", express.static(__dirname + "/src/views/printables"));


//logica de negocio
const choferes = require("./src/models/Choferes");
const vencimientos = require("./src/models/Vencimientos");
const transportes = require("./src/models/Transportes");
const clientes = require("./src/models/Clientes");
const cajas = require("./src/models/Cajas");
const viajes = require("./src/models/Viajes");
const resumen = require("./src/models/Resumen");
const combustible = require("./src/models/Combustible");

//cargo las conexiones
var _conn = null;
const db1 = require("./src/models/MyMongo");
db1.getConnection()
.then(conn=>{
    _conn = conn;
    choferes.setMongoose(conn);
    vencimientos.setMongoose(conn);
    transportes.setMongoose(conn);
    clientes.setMongoose(conn);
    cajas.setMongoose(conn);
    viajes.setMongoose(conn);
    resumen.setMongoose(conn);
    combustible.setMongoose(conn);
});

//asigno las rutas
expressApp.use( choferes.getRoutes() );
expressApp.use( vencimientos.getRoutes() );
expressApp.use( transportes.getRoutes() );
expressApp.use( clientes.getRoutes() );
expressApp.use( cajas.getRoutes() );
expressApp.use( viajes.getRoutes() );
expressApp.use( resumen.getRoutes() );
expressApp.use( combustible.getRoutes() );

expressApp.get(["/", "/inicio", "/index", "/home"], async (req, res)=>{
    let now = fechas.getNow();
    if( now < "2024-01-01" || (typeof conf != "undefined" && typeof conf["licencia"] != "undefined" && conf["licencia"] == "mathias") ){
        let datos = {};
        res.render( path.join(__dirname, "src", "views", "template.ejs"), {cuerpo: "index", titulo: "Inicio", datos: JSON.stringify(datos)} );
    }else{
        res.send("Licencia de prueba vencida");
    }
})
expressApp.get("/get-conf", (req, res)=>{
    try{
        let ret = fs.readFileSync(path.join(__dirname, "conf.json"), "utf8");
        res.json({status: 1, conf: ret});
    }catch(err){
        console.log(err);
        res.json({ status: 0, message: err.toString() });
    }
});
expressApp.post("/set-conf", (req, res)=>{
    try{
        let ret = fs.writeFileSync(path.join(__dirname, "conf.json"), req.fields.conf);
        conf = JSON.parse(req.fields.conf);
        res.json({status: 1, ret: ret});
    }catch(err){
        console.log(err);
        res.json({ status: 0, message: err.toString() });
    }
});
expressApp.post("/open-external", (req, res)=>{
    console.log("Abriendo => ", req.fields.url);
    shell.openExternal(req.fields.url);
});
//abre el navegador local para imprimir
expressApp.post("/imprimir", (req, res)=>{
    //se puede enviar por post "parametros" => ?par1=val1&par2=val2
    shell.openExternal(`http://localhost:3000/obtener-documento/` + (req.fields.parametros ? req.fields.parametros : ""));
});
expressApp.get("/ping", (req, res)=>{
    res.send("pong")
});
expressApp.get("/guid", (req, res)=>{
    res.send(GUID)
});

//guarda un archivo 'imprimir.html' el cual se abre externamente (chrome / edge) para ejecutar la tarea de impresion 
expressApp.post("/exportar-documento", (req, res)=>{
    /* let nombre = "expo_" + (new Date()).getTime() + ".html";  */
    let modelo = fs.readFileSync( path.join(__dirname, "src", "views", "_modelo-impresion.html"), "utf-8");
    let documento = modelo.replace("<!--CONTENIDO-->", req.fields.contenido);
    bufferImpresion = documento;
    //fs.writeFileSync(path.join(__dirname, "imprimir.html"), documento); 
    res.json({status: 1});
});

//obtiene el documento 'imprimir.html' para ser impreso
expressApp.get("/obtener-documento", (req, res)=>{
    res.send(bufferImpresion);
    //res.sendFile( path.join(__dirname, "imprimir.html") );
});

try{
    expressApp.listen(3000, async () => {
        console.log(`Escuchando => http://localhost:${3000}`);
    
        //intento hacer un backup
        try{
            let pathMongodump = conf["path-mongodump"];
            let pathBackup = conf["path-backup"] + "\\dbNicoRemis" + fechas.getNow().replace(":", ".").replace(" ", "_") + ".backup";
            let comando = `"${pathMongodump}" --db dbNicoRemis --gzip --archive=${pathBackup}`;
            exec(comando, (error, stdout, stderr) => {
                //console.log(error, stdout, stderr);
            })
        }catch(err){
    
        }
    })
}catch(err){
    app.quit();
}