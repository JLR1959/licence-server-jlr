/* ======================================================
MODULE 01 — SETUP
====================================================== */

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ======================================================
MODULE 02 — STOCKAGE
====================================================== */

let licences = [];

/* ======================================================
MODULE 03 — GENERATEUR CLE
====================================================== */

function genererBloc(){
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let bloc = "";
    for(let i=0;i<6;i++){
        bloc += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return bloc;
}

function genererCle(){
    return [
        genererBloc(),
        genererBloc(),
        genererBloc(),
        genererBloc(),
        genererBloc(),
        genererBloc(),
        genererBloc()
    ].join("-");
}

/* ======================================================
MODULE 04 — NORMALISATION CLE
====================================================== */

function normaliser(cle){
    return cle.trim().toUpperCase();
}

/* ======================================================
MODULE 05 — PING
====================================================== */

app.get("/ping",(req,res)=>{
    res.json({status:"ok"});
});

/* ======================================================
MODULE 06 — ACTIVER LICENCE
====================================================== */

app.post("/activate-licence",(req,res)=>{

    const cle = genererCle();

    const expiration = new Date();
    expiration.setMonth(expiration.getMonth()+1);

    licences.push({
        licenceKey: normaliser(cle),
        expiration: expiration
    });

    console.log("LICENCE AJOUTÉE :", cle);

    res.json({
        success:true,
        licenceKey: cle
    });

});

/* ======================================================
MODULE 07 — CHECK LICENCE (CORRIGÉ)
====================================================== */

app.post("/check-licence",(req,res)=>{

    let {licenceKey} = req.body;

    if(!licenceKey){
        return res.json({valid:false});
    }

    licenceKey = normaliser(licenceKey);

    console.log("CHECK DEMANDE :", licenceKey);

    const licence = licences.find(l => l.licenceKey === licenceKey);

    if(!licence){
        console.log("❌ NON TROUVÉ");
        return res.json({valid:false});
    }

    const now = new Date();

    if(now > licence.expiration){
        console.log("❌ EXPIRÉ");
        return res.json({valid:false});
    }

    console.log("✅ VALIDE");

    res.json({valid:true});

});

/* ======================================================
MODULE 08 — DEBUG
====================================================== */

app.get("/licences",(req,res)=>{
    res.json(licences);
});

/* ======================================================
MODULE 09 — START
====================================================== */

app.listen(PORT,()=>{
    console.log("Serveur licence actif");
});
