const { app, BrowserWindow, shell } = require('electron');
const { exec } = require('child_process');
const express = require('express');
const expressApp = express();
const path = require("path");
const fs = require("fs");
const formidableMiddleware = require("express-formidable");
const fechas = require("./src/resources/Fechas");

var mainWindow = null;

let conf = null;
try{
    let ret = fs.readFileSync( path.join(__dirname, "conf.json"), "utf8" );
    conf = JSON.parse( ret );
}catch(err){

}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1050,
        icon: __dirname + '/src/resources/icono6.png',
    })

    mainWindow.loadURL('http://localhost:3000/');
    if(conf && conf["env"] && conf["env"].indexOf("dev") > -1) mainWindow.webContents.openDevTools();
    mainWindow.on("closed", ()=> mainWindow = null);
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
});

//asigno las rutas
expressApp.use( choferes.getRoutes() );
expressApp.use( vencimientos.getRoutes() );
expressApp.use( transportes.getRoutes() );
expressApp.use( clientes.getRoutes() );
expressApp.use( cajas.getRoutes() );
expressApp.use( viajes.getRoutes() );
expressApp.use( resumen.getRoutes() );

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
expressApp.post("/imprimir", (req, res)=>{
    shell.openExternal(`http://localhost:3000/printables/${req.fields.documento}`);
});

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
});