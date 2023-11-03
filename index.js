const { app, BrowserWindow } = require('electron');
const express = require('express');
const expressApp = express();
const path = require("path");
const fs = require("fs/promises");
const formidableMiddleware = require("express-formidable");

var mainWindow = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1050,
        icon: __dirname + '/src/resources/icono6.png',
    })

    mainWindow.loadURL('http://localhost:3000/');
    mainWindow.webContents.openDevTools();
    mainWindow.on("closed", ()=> mainWindow = null);
}

app.whenReady().then(createWindow);

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

expressApp.get(["/", "/inicio", "/index", "/home"], (req, res)=>{
    let datos = {};
    res.render( path.join(__dirname, "src", "views", "template.ejs"), {cuerpo: "index", titulo: "Inicio", datos: JSON.stringify(datos)} );
})


//logica de negocio
const choferes = require("./src/models/Choferes");
const vencimientos = require("./src/models/Vencimientos");
const transportes = require("./src/models/Transportes");
const clientes = require("./src/models/Clientes");
const cajas = require("./src/models/Cajas");
const viajes = require("./src/models/Viajes");
const resumen = require("./src/models/Resumen");

//cargo las conexiones
const db1 = require("./src/models/MyMongo");
db1.getConnection()
.then(conn=>{
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

expressApp.listen(3000, () => {
    console.log(`Escuchando => http://localhost:${3000}`);
});