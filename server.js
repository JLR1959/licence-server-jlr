/* ======================================================
SERVEUR LICENCE JLR — FINAL STABLE (STRIPE + EMAIL)
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

const app = express();

/* ======================================================
MODULE 01 — CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ======================================================
MODULE 02 — EMAIL CONFIG (OFFICE365)
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

async function envoyerEmail(email, cle){

  await transporter.sendMail({
    from: `"VPIJLR" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Votre licence VPIJLR",
    text:
`Bonjour,

Voici votre clé licence :

${cle}

Merci de votre confiance.`
  });

  console.log("📧 EMAIL ENVOYÉ :", email);
}

/* ======================================================
MODULE 03 — DATA
====================================================== */

function load(){
  try{
    if(!fs.existsSync(DATA_FILE)) return { actives: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  }catch{
    return { actives: [] };
  }
}

function save(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

/* ======================================================
MODULE 04 — GENERATION CLE 42 CARACTERES
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");

  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
MODULE 05 — ANTI DOUBLON CLE
====================================================== */

function cleExiste(data, cle){
  return data.actives.some(l => l.cle === cle);
}

/* ======================================================
MODULE 06 — PING
====================================================== */

app.get("/ping",(req,res)=>res.send("pong"));

/* ======================================================
MODULE 07 — WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({type:"application/json"}),
  async (req,res)=>{

    const sig = req.headers["stripe-signature"];

    let event;

    try{
      event = stripe.webhooks.constructEvent(req.body,sig,endpointSecret);
    }catch(err){
      console.log("❌ WEBHOOK ERROR :", err.message);
      return res.status(400).send("Webhook Error");
    }

    console.log("🔔 EVENT :", event.type);

    if(event.type === "checkout.session.completed"){

      const session = event.data.object;
      const email = session.customer_details?.email;

      console.log("💰 PAIEMENT REÇU :", email);

      if(!email){
        console.log("❌ EMAIL MANQUANT");
        return res.json({received:true});
      }

      const data = load();

      let cle;

      do{
        cle = genererCle();
      }while(cleExiste(data, cle));

      const licence = {
        cle,
        email,
        actif:true,
        date:new Date().toISOString()
      };

      data.actives.push(licence);

      save(data);

      try{
        await envoyerEmail(email, cle);
      }catch(e){
        console.log("❌ EMAIL ERROR :", e.message);
      }

    }

    res.json({received:true});
});

/* ======================================================
MODULE 08 — JSON NORMAL
====================================================== */

app.use(express.json());

/* ======================================================
MODULE 09 — GET LICENCE
====================================================== */

app.get("/licence/:email",(req,res)=>{

  const data = load();

  const licence = data.actives.find(l=>l.email===req.params.email);

  if(!licence){
    return res.status(404).json({error:"Licence introuvable"});
  }

  res.json({cle:licence.cle});
});

/* ======================================================
MODULE 10 — TEST EMAIL
====================================================== */

app.get("/test-email", async (req,res)=>{

  try{
    await envoyerEmail(
      "jlouisraymond@hotmail.com",
      "AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE-FFFFFF-GGGGGG"
    );
    res.send("EMAIL OK");
  }catch(e){
    res.send("EMAIL ERROR : " + e.message);
  }

});

/* ======================================================
MODULE 11 — START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR ACTIF PORT",PORT);
});
