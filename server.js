/* ======================================================
MODULE 01 — SETUP
====================================================== */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());

// ⚠️ FIX STRIPE BODY PARSER
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    express.json({ limit: "20mb" })(req, res, next);
  }
});

const PORT = process.env.PORT || 3000;

/* ======================================================
MODULE 02 — CONFIG
====================================================== */

const SECRET = "JLR_SECRET_ULTRA_SECURE_2026";

const DATA_FILE = path.join(__dirname, "licences.json");
const STATS_FILE = path.join(__dirname, "stats.json");

/* ======================================================
MODULE 03 — STOCKAGE
====================================================== */

let licences = [];
let statsJournalieres = {};
let clientsSSE = [];

/* ======================================================
MODULE 04 — SMTP
====================================================== */

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ======================================================
MODULE 05 — LICENCE GENERATION
====================================================== */

function genererCleLicence(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let cle = "";

  for(let i=0;i<42;i++){
    cle += chars.charAt(Math.floor(Math.random()*chars.length));
    if((i+1)%6===0 && i!==41) cle += "-";
  }

  return cle;
}
/* ======================================================
MODULE 06 — FICHIERS (CORRIGÉ RENDER SAFE)
====================================================== */

function chargerFichier(){

  try{

    // 🔥 créer fichiers si inexistants (Render)
    if(!fs.existsSync(DATA_FILE)){
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }

    if(!fs.existsSync(STATS_FILE)){
      fs.writeFileSync(STATS_FILE, JSON.stringify({}, null, 2));
    }

    licences = JSON.parse(fs.readFileSync(DATA_FILE,"utf-8"));
    statsJournalieres = JSON.parse(fs.readFileSync(STATS_FILE,"utf-8"));

    console.log("✔ Fichiers chargés");

  }catch(err){

    console.error("❌ Erreur chargement fichiers :", err);

    licences = [];
    statsJournalieres = {};

  }

}

/* ======================================================
MODULE 07 — SIGNATURE
====================================================== */

function signer(data){
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

/* ======================================================
MODULE 08 — LOG
====================================================== */

function envoyerLog(type,message,data={}){
  const log = { time:new Date().toLocaleTimeString(), type, message, ...data };
  clientsSSE.forEach(c=>c.write(`data: ${JSON.stringify(log)}\n\n`));
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
MODULE 10 — LICENCES
====================================================== */

app.post("/licences",(req,res)=>{

  const cle = genererCleLicence();
  const signature = signer(cle);

  const licence = {
    cle,
    signature,
    deviceId:null,
    active:true,
    createdAt:new Date().toISOString()
  };

  licences.push(licence);
  sauvegarderFichier();

  envoyerLog("ok","LICENCE CREATED",{cle});

  res.json({licence});
});

app.post("/verify",(req,res)=>{

  const {cle,signature,deviceId} = req.body;

  const licence = licences.find(l=>l.cle===cle);

  if(!licence) return res.json({valid:false});
  if(signer(cle)!==signature) return res.json({valid:false});

  if(!licence.deviceId){
    licence.deviceId=deviceId;
    sauvegarderFichier();
  }

  if(licence.deviceId!==deviceId) return res.json({valid:false});
  if(!licence.active) return res.json({valid:false});

  res.json({valid:true});
});

/* ======================================================
MODULE 11 — EMAIL
====================================================== */

app.post("/send-report", async (req,res)=>{

  if(req.body.secret !== "Imagine2026"){
    return res.status(403).json({message:"Unauthorized"});
  }

  try{

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.body.destinataire,
      subject:"Rapport de Vérification Préventive",
      text:"Rapport en pièce jointe",
      attachments:[{
        filename:"rapport.pdf",
        content:req.body.pdfBase64,
        encoding:"base64"
      }]
    });

    res.json({ok:true});

  }catch{
    res.status(500).json({error:true});
  }
});

/* ======================================================
MODULE 12 — STATS
====================================================== */

function dateAujourdhui(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

app.post("/stats/increment",(req,res)=>{

  const date = dateAujourdhui();
  const montant = req.body.montant || 0;

  if(!statsJournalieres[date]){
    statsJournalieres[date]={count:0,revenue:0};
  }

  statsJournalieres[date].count++;
  statsJournalieres[date].revenue += montant;

  sauvegarderFichier();
  envoyerLog("info","STATS +1",{date,total:statsJournalieres[date]});

  res.json({ok:true});
});

app.get("/stats/today",(req,res)=>{
  const date = dateAujourdhui();
  res.json({
    date,
    data: statsJournalieres[date] || {count:0,revenue:0}
  });
});

app.get("/stats",(req,res)=>{
  res.json(statsJournalieres);
});

/* ======================================================
MODULE 13 — STRIPE WEBHOOK
====================================================== */

app.post("/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature invalide :", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {

    const session = event.data.object;

    console.log("✅ Paiement confirmé :", session.customer_email);

    // 🔥 CRÉATION LICENCE AUTO
    const cle = genererCleLicence();
    const signature = signer(cle);

    licences.push({
      cle,
      signature,
      deviceId:null,
      active:true,
      createdAt:new Date().toISOString(),
      email: session.customer_email
    });

    sauvegarderFichier();

    console.log("🔑 Licence générée :", cle);
  }

  res.json({ received: true });
});

/* ======================================================
MODULE 14 — ROUTES
====================================================== */

app.get("/",(req,res)=> res.send("SERVER READY"));
app.get("/ping",(req,res)=> res.send("OK"));

/* ======================================================
MODULE 15 — START
====================================================== */

chargerFichier();

app.listen(PORT,()=>{
  console.log("SERVER RUNNING PORT "+PORT);
});
