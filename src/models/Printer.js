const { shell } = require('electron');
const { Router } = require("express")
const router = Router()
const path = require("path")
const fs = require("fs/promises");
const mongoose = require("mongoose");

let myMongo = null;

router.get("/imprimir/:documento/:p1/:p2", async (req, res)=>{
    try{
        let datos = {};
        res.sendFile( path.join(__dirname, "..", "views", "imprimir.html") );
    }catch(err){
        console.log(err);
        res.json({status: 0, message: err.toString()});
    }
})
router.post("/imprimir", (req, res)=>{
    shell.openExternal(`http://localhost:3000/imprimir/${req.fields.documento}/${req.fields.p1 || "0"}/${req.fields.p2 || "0"}`);
});

module.exports.setMongoose = (conn) =>{ 
    myMongo = conn;
};
module.exports.getRoutes = () => router;