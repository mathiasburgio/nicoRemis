const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const clienteSchema = new mongoose.Schema({
    nombre: String,
    telefono: String,
    direccion: String,
    anotacion: String,
    eliminado: Boolean,
    creado: Date
});

router.get("/clientes", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "clientes", 
            titulo: "Clientes", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/clientes/get-list", async (req, res)=>{
    try{
        let query = {eliminado: false};
        if(req.query.activos) query.activo = true;

        let ret = await myMongo.model("Cliente").find(query);
        let saldos = {};
        res.json({status: 1, list: ret, saldos});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/clientes/get-one/:cid", async(req, res)=>{
    try{
        let ret = await myMongo.model("Cliente").findOne({_id: req.params.cid});
        res.json({status: 1, cliente: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/clientes/save", async(req, res)=>{
    try{
        if(req.fields._action == "new"){
            let cliente = myMongo.model("Cliente")({
                nombre: req.fields.nombre,
                telefono: req.fields.telefono,
                direccion: req.fields.direccion,
                anotacion: req.fields.anotacion,
                eliminado: false,
                creado: new Date()
            });
            await cliente.save();
            res.json({status:1, cliente: cliente});
        }else{
            await myMongo.model("Cliente").updateOne({_id: req.fields._id}, {
                nombre: req.fields.nombre,
                telefono: req.fields.telefono,
                direccion: req.fields.direccion,
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
    myMongo.model("Cliente", clienteSchema);
};
module.exports.getRoutes = () => router;