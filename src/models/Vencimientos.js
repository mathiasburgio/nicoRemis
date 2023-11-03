const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const vencimientoSchema = new mongoose.Schema({
    model: String,
    oid: oid,
    nombre: String,
    fecha: String,
    detalle: String,
    activo: Boolean
});

router.get("/vencimientos/find", async (req, res)=>{
    try{
        let query = {
            model: req.query.model,
            oid: req.query.oid
        };
        if(req.query.nombre) query.nombre = req.query.nombre;
        
        let ret = await myMongo.model("Vencimiento").find(query)
        .sort({_id: -1}).limit(20);

        res.json({status:1, result: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});

router.get("/vencimientos/get-all", async (req, res)=>{
    try{
        let ret = await myMongo.model("Vencimiento").find({activo: true});
        res.json({status:1, result: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});

router.post("/vencimientos/insert", async (req, res)=>{
    try{
        let ret = await myMongo.model("Vencimiento")
        .updateMany({
            model: req.fields.model,
            oid: req.fields.oid,
            nombre: req.fields.nombre,
        }, {
            activo: false
        })
        console.log(ret);

        let venc = myMongo.model("Vencimiento")({
            model: req.fields.model,
            oid: req.fields.oid,
            nombre: req.fields.nombre,
            fecha: req.fields.fecha,
            detalle: req.fields.detalle || "",
            activo: true
        });
        await venc.save();

        res.json({status:1, vencimiento: venc});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
    myMongo.model("Vencimiento", vencimientoSchema);
};
module.exports.getRoutes = () => router;