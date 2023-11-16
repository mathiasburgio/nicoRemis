const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

var MyMongo = null;

router.get("/resumen", async (req, res)=>{
    try{
        let datos = {};
        res.render( path.join(__dirname, "..", "views" ,"template.ejs"), 
        {
            cuerpo: "resumen", 
            titulo: "Resumen", 
            datos: JSON.stringify(datos)
        });
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
};
module.exports.getRoutes = () => router;