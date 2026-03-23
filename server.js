/* ======================================================
MODULE 01 — SETUP
====================================================== */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ======================================================
MODULE 02 — CONFIG SECRET
====================================================== */

const SECRET = "JLR_SECRET_ULTRA_SECURE_2026";

/* ======================================================
MODULE 03 — STOCKAGE
====================================================== */

let licences = [];
let clientsSSE = [];

/* ======================================================
MODULE 04 — SIGNATURE
====================================================== */

function signer(data){
    return crypto
        .createHmac("sha256", SECRET)
        .update(data)
        .digest("hex");
}

/* ======================================================
MODULE 05 — LOG
====================================================== */

function envoyerLog(type, message, data = {}){

    const log = {
        time: new Date().toLocaleTimeString(),
        type,
        message,
        ...data
    };

    clientsSSE.forEach(client=>{
        client.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    console.log(log);
}

/* ======================================================
MODULE 06 — SSE
====================================================== */

app.get("/logs", (req, res)=>{

    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");

    res.flushHeaders();

    clientsSSE.push(res);

    envoyerLog("info","Client connecté LIVE");

    req.on("close", ()=>{
        clientsSSE = clientsSSE.filter(c=>c!==res);
    });
});

/* ======================================================
MODULE 07 — CREATION LICENCE
====================================================== */

app.post("/licence",(req,res)=>{

    const cle = crypto.randomBytes(16).toString("hex");

    const signature = signer(cle);

    licences.push({
        cle,
        signature,
        deviceId: null,
        active: true,
        ...req.body
    });

    envoyerLog("ok","Licence créée",{cle});

    res.json({cle, signature});
});

/* ======================================================
MODULE 08 — VALIDATION LICENCE
====================================================== */

app.post("/verify",(req,res)=>{

    const {cle, signature, deviceId} = req.body;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const licence = licences.find(l=>l.cle === cle);

    if(!licence){
        envoyerLog("error","Licence inconnue",{ip});
        return res.json({valid:false});
    }

    const validSignature = signer(cle);

    if(validSignature !== signature){
        envoyerLog("error","Signature invalide",{ip});
        return res.json({valid:false});
    }

    // Liaison appareil
    if(!licence.deviceId){
        licence.deviceId = deviceId;
        envoyerLog("info","Licence liée appareil",{deviceId});
    }

    // Vérifie appareil
    if(licence.deviceId !== deviceId){
        envoyerLog("error","Licence utilisée sur autre machine",{ip});
        return res.json({valid:false});
    }

    if(!licence.active){
        envoyerLog("error","Licence désactivée",{ip});
        return res.json({valid:false});
    }

    envoyerLog("ok","Licence valide",{ip});

    res.json({valid:true});
});

/* ======================================================
MODULE 09 — ROUTES
====================================================== */

app.get("/",(req,res)=>{
    res.send("SERVEUR SECURE OK");
});

app.get("/ping",(req,res)=>{
    res.send("OK");
});

/* ======================================================
MODULE 10 — START
====================================================== */

app.listen(PORT, ()=>{
    console.log("Serveur sécurisé lancé");
});
