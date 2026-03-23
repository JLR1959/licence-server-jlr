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
let clientsSSE = [];

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
MODULE 05 — LOG TEMPS REEL
====================================================== */

function envoyerLog(type, message){

    const log = {
        time: new Date().toLocaleTimeString(),
        type,
        message
    };

    clientsSSE.forEach(client=>{
        client.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    console.log(`[${type}] ${message}`);
}

/* ======================================================
MODULE 06 — SSE (LIVE STREAM)
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
        envoyerLog("info","Client déconnecté LIVE");
    });
});

/* ======================================================
MODULE 07 — ROUTES API
====================================================== */

app.get("/ping",(req,res)=>{
    envoyerLog("ok","Ping serveur");
    res.send("OK");
});

app.post("/licence",(req,res)=>{
    const cle = genererCle();

    licences.push({
        cle,
        ...req.body
    });

    envoyerLog("ok","Licence créée");

    res.json({cle});
});

app.get("/licences",(req,res)=>{
    envoyerLog("info","Lecture licences");
    res.json(licences);
});

/* ======================================================
MODULE 08 — START SERVER
====================================================== */

app.listen(PORT, ()=>{
    console.log("Serveur démarré sur port", PORT);
});
