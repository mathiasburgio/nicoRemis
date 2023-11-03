const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const transporteSchema = new mongoose.Schema({
    nombre: String,
    dominio: String,
    marcaModelo: String,
    anio: Number,
    activo: Boolean,
    anotacion: String,
    eliminado: Boolean,
    proximoService: Number,//guarda los KM hasta el proximo service
    creado: Date
});

router.get("/transportes", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "transportes", 
            titulo: "Transportes", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/transportes/get-list", async (req, res)=>{
    try{
        let query = {eliminado: false};
        if(req.query.activo) query.activo = true;

        let ret = await myMongo.model("Transporte").find(query);
        res.json({status: 1, list: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/transportes/get-one/:cid", async(req, res)=>{
    try{
        let ret = await myMongo.model("Transporte").findOne({_id: req.params.cid});
        res.json({status: 1, transporte: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/transportes/save", async(req, res)=>{
    try{
        if(req.fields._action == "new"){
            let transporte = myMongo.model("Transporte")({
                nombre: req.fields.nombre,
                dominio: req.fields.dominio,
                marcaModelo: req.fields.marcaModelo,
                anio: req.fields.anio,
                proximoService: req.fields.proximoService,
                activo: req.fields.activo,
                anotacion: req.fields.anotacion,
                eliminado: false,
                creado: new Date()
            });
            await transporte.save();
            res.json({status:1, transporte: transporte});
        }else{
            await myMongo.model("Transporte").updateOne({_id: req.fields._id}, {
                nombre: req.fields.nombre,
                dominio: req.fields.dominio,
                marcaModelo: req.fields.marcaModelo,
                anio: req.fields.anio,
                activo: req.fields.activo,
                anotacion: req.fields.anotacion,
            });
            res.json({status:1});
        }
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
    myMongo.model("Transporte", transporteSchema);
};
module.exports.getRoutes = () => router;