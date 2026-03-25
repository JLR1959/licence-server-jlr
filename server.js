/* ======================================================
SERVEUR LICENCE JLR — VERSION FINALE STRIPE + EMAIL
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

const app = express();

/* ======================================================
CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ======================================================
EMAIL CONFIG
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
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Votre licence VPIJLR",
    text: `Votre clé licence : ${cle}`
  });
}

/* ======================================================
UTILS
====================================================== */

function chargerData(){
  try{
    if(!fs.existsSync(DATA_FILE)) return { actives: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  }catch{
    return { actives: [] };
  }
}

function sauvegarderData(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bloc = () => Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
PING
====================================================== */

app.get("/ping",(req,res)=>res.send("pong"));

/* ======================================================
WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({type:"application/json"}),
  async (req,res)=>{

    const sig = req.headers["stripe-signature"];

    let event;

    try{
      event = stripe.webhooks.constructEvent(req.body,sig,endpointSecret);
    }catch(err){
      return res.status(400).send("Webhook Error");
    }

    if(event.type === "checkout.session.completed"){

      const session = event.data.object;

      const email = session.customer_details?.email;

      if(!email) return res.json({received:true});

      const data = chargerData();

      const cle = genererCle();

      data.actives.push({
        cle,
        email,
        actif:true,
        date:new Date().toISOString()
      });

      sauvegarderData(data);

      try{
        await envoyerEmail(email, cle);
        console.log("EMAIL OK :", email);
      }catch(e){
        console.log("EMAIL ERROR :", e.message);
      }

    }

    res.json({received:true});
});

/* ======================================================
JSON
====================================================== */

app.use(express.json());

/* ======================================================
GET LICENCE
====================================================== */

app.get("/licence/:email",(req,res)=>{

  const data = chargerData();

  const licence = data.actives.find(l=>l.email===req.params.email);

  if(!licence){
    return res.status(404).json({error:"Licence introuvable"});
  }

  res.json({cle:licence.cle});
});

/* ======================================================
PORT
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("SERVER RUNNING PORT",PORT);
});
