/* ======================================================
MODULE 01 — SETUP SERVEUR
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_FILE = "licences.json";

/* ======================================================
MODULE 02 — DB (LECTURE / SAUVEGARDE)
====================================================== */

function lireDB(){
    if(!fs.existsSync(DB_FILE)){
        fs.writeFileSync(DB_FILE, JSON.stringify({actives:[]}, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function sauverDB(data){
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ======================================================
MODULE 03 — GENERATEUR CLE LICENCE (42 CARACTÈRES)
FORMAT : XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX
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
MODULE 04 — PING
====================================================== */

app.get("/ping",(req,res)=>{
    res.json({status:"ok"});
});

/* ======================================================
MODULE 05 — VERIFY SESSION (SIMULATION)
⚠️ REMPLACE PLUS TARD PAR STRIPE RÉEL
====================================================== */

app.post("/verify-session",(req,res)=>{

    const {session_id} = req.body;

    if(!session_id){
        return res.status(400).json({error:"session_id manquant"});
    }

    // TEMPORAIRE (remplacer par Stripe réel plus tard)
    const fakeEmail = "client@test.com";

    res.json({
        success:true,
        email: fakeEmail
    });

});

/* ======================================================
MODULE 06 — ACTIVATION LICENCE
====================================================== */

app.post("/activate-licence",(req,res)=>{

    const {email, type} = req.body;

    if(!email){
        return res.status(400).json({error:"email manquant"});
    }

    const db = lireDB();

    // éviter doublon licence
    let existante = db.actives.find(l => l.email === email);

    if(existante){
        return res.json({
            success:true,
            licenceKey: existante.licenceKey,
            expiration: existante.expiration
        });
    }

    const cle = genererCle();

    const expiration = new Date();
    expiration.setMonth(expiration.getMonth()+1);

    const licence = {
        email,
        licenceKey: cle,
        type: type || "mensuelle",
        expiration: expiration.toISOString(),
        active: true
    };

    db.actives.push(licence);
    sauverDB(db);

    res.json({
        success:true,
        licenceKey: cle,
        expiration: licence.expiration
    });

});

/* ======================================================
MODULE 07 — VERIFICATION LICENCE
====================================================== */

app.post("/check-licence",(req,res)=>{

    const {licenceKey} = req.body;

    if(!licenceKey){
        return res.json({valid:false});
    }

    const db = lireDB();

    const licence = db.actives.find(l=>l.licenceKey === licenceKey);

    if(!licence){
        return res.json({valid:false});
    }

    const now = new Date();
    const exp = new Date(licence.expiration);

    if(now > exp){
        return res.json({
            valid:false,
            expired:true
        });
    }

    res.json({
        valid:true,
        email: licence.email
    });

});

/* ======================================================
MODULE 08 — DEBUG LICENCES
====================================================== */

app.get("/licences",(req,res)=>{
    const db = lireDB();
    res.json(db);
});

/* ======================================================
MODULE 09 — START SERVEUR
====================================================== */

app.listen(PORT,()=>{
    console.log("Serveur licence actif sur port", PORT);
});
