/* ======================================================
MODULE 01 — SETUP
====================================================== */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ======================================================
MODULE 02 — CONFIG
====================================================== */

const SECRET = "JLR_SECRET_ULTRA_SECURE_2026";

const DATA_FILE = path.join(__dirname, "licences.json");
const BACKUP_FILE = path.join(__dirname, "licences.backup.json");

/* ======================================================
MODULE 03 — STOCKAGE
====================================================== */

let licences = [];
let clientsSSE = [];

/* ======================================================
MODULE 04 — GENERATION CLE 42
====================================================== */

function genererCleLicence(){

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const blocs = [];

    for(let b = 0; b < 7; b++){

        let bloc = "";

        for(let i = 0; i < 6; i++){
            bloc += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        blocs.push(bloc);
    }

    return blocs.join("-");
}

/* ======================================================
MODULE 05 — CHARGEMENT SECURISE
====================================================== */

function chargerFichier(){

    try{

        if(fs.existsSync(DATA_FILE)){
            licences = JSON.parse(fs.readFileSync(DATA_FILE,"utf-8"));
            console.log("DATA LOAD:", licences.length);
            return;
        }

        if(fs.existsSync(BACKUP_FILE)){
            licences = JSON.parse(fs.readFileSync(BACKUP_FILE,"utf-8"));
            console.log("BACKUP LOAD:", licences.length);
            return;
        }

        licences = [];

    }catch(e){

        console.error("LOAD FAIL");

        try{
            licences = JSON.parse(fs.readFileSync(BACKUP_FILE,"utf-8"));
        }catch{
            licences = [];
        }
    }
}

/* ======================================================
MODULE 06 — SAUVEGARDE ATOMIQUE
====================================================== */

function sauvegarderFichier(){

    try{

        const temp = DATA_FILE + ".tmp";

        fs.writeFileSync(temp, JSON.stringify(licences,null,2));

        if(fs.existsSync(DATA_FILE)){
            fs.copyFileSync(DATA_FILE, BACKUP_FILE);
        }

        fs.renameSync(temp, DATA_FILE);

    }catch(e){
        console.error("SAVE ERROR");
    }
}

/* ======================================================
MODULE 07 — SIGNATURE
====================================================== */

function signer(data){
    return crypto
        .createHmac("sha256", SECRET)
        .update(data)
        .digest("hex");
}

/* ======================================================
MODULE 08 — LOG
====================================================== */

function envoyerLog(type, message, data = {}){

    const log = {
        time: new Date().toLocaleTimeString(),
        type,
        message,
        ...data
    };

    clientsSSE.forEach(c=>{
        c.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    console.log(log);
}

/* ======================================================
MODULE 09 — SSE
====================================================== */

app.get("/logs",(req,res)=>{

    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");

    res.flushHeaders();

    clientsSSE.push(res);

    envoyerLog("info","LIVE CONNECT");

    req.on("close", ()=>{
        clientsSSE = clientsSSE.filter(c=>c!==res);
    });
});

/* ======================================================
MODULE 10 — CREATION LICENCE
====================================================== */

app.post("/licences",(req,res)=>{

    try{

        const cle = genererCleLicence();
        const signature = signer(cle);

        const licence = {
            cle,
            signature,
            deviceId: null,
            active: true,
            client: req.body.client || "",
            email: req.body.email || "",
            type: req.body.type || "",
            dateActivation: req.body.dateActivation || "",
            dateExpiration: req.body.dateExpiration || "",
            createdAt: new Date().toISOString()
        };

        licences.push(licence);

        sauvegarderFichier();

        envoyerLog("ok","LICENCE CREATED",{cle});

        res.json({licence});

    }catch(e){
        envoyerLog("error","CREATE FAIL");
        res.status(500).json({error:true});
    }
});

/* ======================================================
MODULE 11 — LISTE
====================================================== */

app.get("/licences",(req,res)=>{
    res.json(licences);
});

/* ======================================================
MODULE 12 — VALIDATION
====================================================== */

app.post("/verify",(req,res)=>{

    try{

        const {cle, signature, deviceId} = req.body;

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const licence = licences.find(l=>l.cle === cle);

        if(!licence){
            envoyerLog("error","UNKNOWN",{ip});
            return res.json({valid:false});
        }

        if(signer(cle) !== signature){
            envoyerLog("error","BAD SIGN",{ip});
            return res.json({valid:false});
        }

        if(!licence.deviceId){
            licence.deviceId = deviceId;
            sauvegarderFichier();
            envoyerLog("info","DEVICE LINK",{deviceId});
        }

        if(licence.deviceId !== deviceId){
            envoyerLog("error","DEVICE MISMATCH",{ip});
            return res.json({valid:false});
        }

        if(!licence.active){
            envoyerLog("error","DISABLED",{ip});
            return res.json({valid:false});
        }

        envoyerLog("ok","VALID",{ip});

        res.json({valid:true});

    }catch(e){
        envoyerLog("error","VERIFY FAIL");
        res.json({valid:false});
    }
});

/* ======================================================
MODULE 13 — DESACTIVATION
====================================================== */

app.post("/licences/deactivate",(req,res)=>{

    const {cle} = req.body;

    const licence = licences.find(l=>l.cle === cle);

    if(!licence){
        return res.json({success:false});
    }

    licence.active = false;

    sauvegarderFichier();

    envoyerLog("warn","DISABLED",{cle});

    res.json({success:true});
});

/* ======================================================
MODULE 14 — HEALTH
====================================================== */

app.get("/health",(req,res)=>{
    res.json({
        status:"ok",
        licences: licences.length,
        uptime: process.uptime()
    });
});

/* ======================================================
MODULE 15 — ROUTES
====================================================== */

app.get("/",(req,res)=>{
    res.send("LICENCE SERVER READY");
});

app.get("/ping",(req,res)=>{
    res.send("OK");
});

/* ======================================================
MODULE 16 — AUTO SAVE
====================================================== */

setInterval(()=>{
    sauvegarderFichier();
},10000);

/* ======================================================
MODULE 17 — START
====================================================== */

chargerFichier();

app.listen(PORT, ()=>{
    console.log("SERVER RUNNING PORT " + PORT);
});
