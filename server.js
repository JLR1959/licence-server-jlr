/* ======================================================
MODULE 01 — SETUP
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 3000;

/* ======================================================
MODULE 02 — CONFIG
====================================================== */

const STATS_FILE = path.join(__dirname, "stats.json");

/* ======================================================
MODULE 03 — STOCKAGE
====================================================== */

let statsJournalieres = {};

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
MODULE 05 — CHARGEMENT
====================================================== */

function chargerStats(){
  try{
    if(fs.existsSync(STATS_FILE)){
      statsJournalieres = JSON.parse(fs.readFileSync(STATS_FILE,"utf-8"));
    }
  }catch(e){
    statsJournalieres = {};
  }
}

/* ======================================================
MODULE 06 — SAUVEGARDE
====================================================== */

function sauvegarderStats(){
  try{
    fs.writeFileSync(STATS_FILE, JSON.stringify(statsJournalieres,null,2));
  }catch(e){
    console.error("SAVE ERROR");
  }
}

/* ======================================================
MODULE 07 — DATE
====================================================== */

function dateAujourdhui(){
  const d = new Date();
  return d.getFullYear() + "-" +
         String(d.getMonth()+1).padStart(2,"0") + "-" +
         String(d.getDate()).padStart(2,"0");
}

/* ======================================================
MODULE 08 — STATS
====================================================== */

app.post("/stats/increment",(req,res)=>{

  const date = dateAujourdhui();
  const montant = req.body.montant || 0;

  if(!statsJournalieres[date]){
    statsJournalieres[date] = {
      count:0,
      revenue:0
    };
  }

  statsJournalieres[date].count++;
  statsJournalieres[date].revenue += montant;

  sauvegarderStats();

  res.json({
    ok:true,
    date,
    total:statsJournalieres[date]
  });
});

app.get("/stats/today",(req,res)=>{

  const date = dateAujourdhui();

  res.json({
    date,
    data: statsJournalieres[date] || {
      count:0,
      revenue:0
    }
  });
});

app.get("/stats",(req,res)=>{
  res.json(statsJournalieres);
});

/* ======================================================
MODULE 09 — EMAIL
====================================================== */

app.post("/send-report", async (req,res)=>{

  try{

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.body.destinataire,
      subject: "Rapport de Vérification",
      text: "Rapport en pièce jointe",
      attachments:[{
        filename:"rapport.pdf",
        content:req.body.pdfBase64,
        encoding:"base64"
      }]
    });

    res.json({ok:true});

  }catch(e){
    console.error(e);
    res.status(500).json({error:true});
  }

});

/* ======================================================
MODULE 10 — ROUTES
====================================================== */

app.get("/",(req,res)=> res.send("SERVER PERSO OK"));
app.get("/ping",(req,res)=> res.send("OK"));

/* ======================================================
MODULE 11 — START
====================================================== */

chargerStats();

app.listen(PORT, ()=>{
  console.log("SERVER PERSO RUNNING PORT " + PORT);
});
