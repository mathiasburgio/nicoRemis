const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const combustibleSchema = new mongoose.Schema({
    fecha: Date,
    transporte: oid,
    chofer: oid,
    litros: Number,
    monto: Number,
    tipo: Number //0-Gasoil caro, 1-Gasoil barato, 2-Nafta cara, 3-Nafta barata
});

router.get("/combustible", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "combustible", 
            titulo: "Combustible", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/combustible/get-list/:tid", async (req, res)=>{
    try{
        let ret = await myMongo.model("Combustible").find({transporte: req.params.tid});
        res.json({status: 1, list: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.post("/combustible/save", async(req, res)=>{
    try{
        let registro = myMongo.model("Combustible")({
            fecha: new Date(),
            transporte: req.fields.tid,
            //chofer: req.fields.cid,
            litros: req.fields.litros,
            monto: req.fields.monto,
            tipo: req.fields.tipo
        });
        await registro.save();
        res.json({status:1, registro: registro});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
    myMongo.model("Combustible", combustibleSchema);
};
module.exports.getRoutes = () => router;