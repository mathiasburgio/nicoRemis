const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const choferSchema = new mongoose.Schema({
    nombre: String,
    telefono: String,
    activo: Boolean,
    anotacion: String,
    eliminado: Boolean,
    creado: Date
});

router.get("/choferes", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "choferes", 
            titulo: "Choferes", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/choferes/get-list", async (req, res)=>{
    try{
        let query = {eliminado: false};
        if(req.query.activo) query.activo = true;

        let ret = await myMongo.model("Chofer").find(query);
        res.json({status: 1, list: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/choferes/get-one/:cid", async(req, res)=>{
    try{
        let ret = await myMongo.model("Chofer").findOne({_id: req.params.cid});
        res.json({status: 1, chofer: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/choferes/save", async(req, res)=>{
    try{
        if(req.fields._action == "new"){
            let chofer = myMongo.model("Chofer")({
                nombre: req.fields.nombre,
                telefono: req.fields.telefono,
                activo: req.fields.activo,
                anotacion: req.fields.anotacion,
                eliminado: false,
                creado: new Date()
            });
            await chofer.save();
            res.json({status:1, chofer: chofer});
        }else{
            await myMongo.model("Chofer").updateOne({_id: req.fields._id}, {
                nombre: req.fields.nombre,
                telefono: req.fields.telefono,
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
    myMongo.model("Chofer", choferSchema);
};
module.exports.getRoutes = () => router;