const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

const oid = mongoose.Schema.Types.ObjectId;
const mixed = mongoose.Schema.Types.Mixed;

const cajaSchema = new mongoose.Schema({
    nombre: String,
    activa: Boolean,
    eliminada: Boolean
});

const registroCajaSchema = new mongoose.Schema({
    fecha: Date,
    detalle: String,
    monto: Number,
    caja: oid,
    model: String,//cliente, chofer, etc
    modelOid: oid,//_id del modelo
    viaje: Number//si esta asociado a un viaje, el numero de viaje
});


router.get("/cajas", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "cajas", 
            titulo: "Cajas", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})

router.get("/cajas/get-list", async (req, res)=>{
    try{
        //?as=object|array
        let cajas = await myMongo.model("Caja").find({eliminada: false});
        let registros = await myMongo.model("RegistroCaja").find();
        
        //genero un objeto con las cajas y les asigno saldo 0
        let _cajas = {};
        for(let c of cajas){
            _cajas[c._id] = c.toObject();//toObject para poder editarla
            _cajas[c._id].saldo = 0;
        }
        //recorro todos los registros y voy sumando saldo a las cajas
        for(let r of registros){
            if(_cajas[r.caja]) _cajas[r.caja].saldo += r.monto;
        }

        let ret = _cajas;
        if(req.query?.as == "object") ret = _cajas;
        if(req.query?.as == "array"){
            ret = [];
            for(let c in _cajas){
                ret.push(_cajas[c]);
            }
        }

        //retorno las cajas con los saldos
        res.json({status:1, list: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.post("/cajas/save", async(req, res)=>{
    try{
        if(req.fields._action == "new"){
            let caja = myMongo.model("Caja")({
                nombre: req.fields.nombre,
                activa: req.fields.activa,
                eliminada: false
            });
            await caja.save();
            res.json({status:1, caja: caja});
        }else{
            //console.log(req.fields);
            await myMongo.model("Caja").updateOne({_id: req.fields._id}, {
                nombre: req.fields.nombre,
                activa: req.fields.activa,
                eliminada: req.fields.eliminada
            });
            res.json({status:1});
        }
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/cajas/add-registry", async(req, res)=>{
    try{
        let reg = myMongo.model("RegistroCaja")({
            fecha: new Date(),
            detalle: req.fields.detalle,
            monto: req.fields.monto,
            caja: req.fields.cid,
            model: req.fields.model || "default",
            modelOid: req.fields.modelOid || null,
            viaje: req.fields.viaje || 0,
        });
        await reg.save();
        res.json({status:1, registro: reg});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/cajas/get-registries/:cid", async (req, res)=>{
    try{
        let ret = await myMongo.model("RegistroCaja").find({caja: req.params.cid});
        res.json({status:1, result: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
});
router.get("/cajas/get-month/:year/:month", async(req, res)=>{
    try{
        const mes = Number(req.params.month) || 0;
        const anio = Number(req.params.year) || 0;
    
        const mes00 = (mes < 10 ? "0" + mes : "" + mes);//agrego cero inicial en caso de hacer falta
    
        let aux = new Date(anio, mes, 0);//notese q paso mes directamente sin restarle 1, ya que lo q me interes es siempre el mes siguiente
        let f1 = `${anio}-${mes00}-01T00:00`;
        let f2 = `${anio}-${mes00}-${aux.getDate()}T23:59`;
        const filtro = { fecha: { $gte: f1, $lte: f2 } };
        let ret = await myMongo.model("RegistroCaja").find(filtro);
        res.json({status: 1, result: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.get("/cajas/:model/:oid", async(req, res)=>{
    try{
        let ret = await myMongo.model("RegistroCaja").find({ model: req.params.model, modelOid: req.params.oid });
        res.json({status:1, result: ret});
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
    myMongo.model("Caja", cajaSchema);
    myMongo.model("RegistroCaja", registroCajaSchema);
};
module.exports.getRoutes = () => router;