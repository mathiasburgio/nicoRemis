const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const viajeSchema = new mongoose.Schema({
    numero: Number,
    origen: String,
    destino: String,
    fechaPartida: Date,
    fechaRegreso: Date,
    kilometrosRecorrer: Number,
    cliente: oid,
    pasajeros: Number,
    chofer: oid,
    transporte: oid,
    valorViaje: Number,
    cobrado: Boolean,
    comisionChofer: Number,
    pagado: Boolean,
    anotacion: String,

    estado: Number,//1-CREADO, 2-VIAJANDO, 3-CONCRETADO, 4-CANCELADO
    creado: Date
});

router.get("/viajes", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "viajes", 
            titulo: "Viajes", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/viajes/get-list", async (req, res)=>{
    try{
        let ret = await myMongo.model("Viaje").find();
        res.json({status: 1, list: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/viajes/get-one/:cid", async(req, res)=>{
    try{
        let ret = await myMongo.model("Viaje").findOne({_id: req.params.cid});
        res.json({status: 1, viaje: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/viajes/save", async(req, res)=>{
    try{
        if(req.fields._action == "new"){

            let ultimoViaje = await myMongo.model("Viaje").find({}).sort({_id: -1});
            let ultimoNumero = ultimoViaje.length > 0 ? ultimoViaje[0].numero : 0;

            let viaje = myMongo.model("Viaje")({
                numero: (ultimoNumero + 1),
                origen: req.fields.origen,
                destino: req.fields.destino,
                fechaPartida: req.fields.fechaPartida,
                fechaRegreso: req.fields.fechaRegreso,
                kilometrosRecorrer: req.fields.kilometrosRecorrer,
                cliente: req.fields.cliente,
                pasajeros: req.fields.pasajeros,
                chofer: req.fields.chofer,
                transporte: req.fields.transporte,
                valorViaje: req.fields.valorViaje,
                cobrado: false,
                comisionChofer: req.fields.comisionChofer,
                pagado: false,
                anotacion: req.fields.anotacion,
            
                estado: 1,//1-CREADO, 2-VIAJANDO, 3-CONCRETADO, 4-CANCELADO
                creado: new Date()
            });
            await viaje.save();
            res.json({status:1, viaje: viaje});
        }else{
            await myMongo.model("Viaje").updateOne({_id: req.fields._id}, {
                origen: req.fields.origen,
                destino: req.fields.destino,
                fechaPartida: req.fields.fechaPartida,
                fechaRegreso: req.fields.fechaRegreso,
                kilometrosRecorrer: req.fields.kilometrosRecorrer,
                cliente: req.fields.cliente,
                pasajeros: req.fields.pasajeros,
                chofer: req.fields.chofer,
                transporte: req.fields.transporte,
                valorViaje: req.fields.valorViaje,
                comisionChofer: req.fields.comisionChofer,
                anotacion: req.fields.anotacion,
            });
            res.json({status:1});
        }
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/viajes/set-state", async(req, res)=>{
    try{
        let ret = await myMongo.model("Viaje")
        .updateOne({_id: req.fields.vid}, {estado: req.fields.estado});
        res.json({status: 1});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
    myMongo.model("Viaje", viajeSchema);
};
module.exports.getRoutes = () => router;