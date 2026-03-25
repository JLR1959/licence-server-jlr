/* ======================================================
SERVEUR LICENCE JLR — FINAL STABLE EMAIL GARANTI
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

const app = express();

/* ======================================================
MODULE 00 — BASE
====================================================== */

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 01 — ROOT (IMPORTANT)
====================================================== */

app.get("/", (req,res)=>{
  res.send("SERVEUR LICENCE JLR OK");
});

/* ======================================================
MODULE 02 — STRIPE SAFE
====================================================== */

let stripe = null;

try{
  if(process.env.STRIPE_SECRET_KEY){
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe chargé");
  }else{
    console.log("⚠️ Stripe non configuré");
  }
}catch(e){
  console.log("❌ Stripe error:", e.message);
}

/* ======================================================
MODULE 03 — EMAIL (ANTI BLOCAGE)
====================================================== */

let transporter = null;

try{
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log("✅ Email prêt");
}catch(e){
  console.log("❌ Email init error:", e.message);
}

async function envoyerEmail(email, cle){

  if(!transporter){
    console.log("❌ Email non configuré");
    return;
  }

  try{

    await Promise.race([

      transporter.sendMail({
        from: `"VPIJLR" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Votre licence VPIJLR",
        text:
`Bonjour,

Voici votre clé licence :

${cle}

Merci de votre confiance.`
      }),

      new Promise((_, reject)=>
        setTimeout(()=>reject(new Error("Timeout email")),8000)
      )

    ]);

    console.log("📧 EMAIL ENVOYÉ :", email);

  }catch(e){

    console.log("❌ EMAIL ERROR :", e.message);

  }
}

/* ======================================================
MODULE 04 — DATA
====================================================== */

function load(){
  try{
    if(!fs.existsSync(DATA_FILE)) return { actives: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
  }catch(e){
    console.log("❌ JSON ERROR:", e.message);
    return { actives: [] };
  }
}

function save(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
}

/* ======================================================
MODULE 05 — GENERATION CLE
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
MODULE 06 — PING
====================================================== */

app.get("/ping",(req,res)=>res.send("pong"));

/* ======================================================
MODULE 07 — GET ALL LICENCES
====================================================== */

app.get("/licences",(req,res)=>{
  const data = load();
  res.json(data.actives);
});

/* ======================================================
MODULE 08 — CREATE LICENCE (MANUEL)
====================================================== */

app.post("/licences",(req,res)=>{

  const { email } = req.body;

  if(!email){
    return res.status(400).json({error:"Email requis"});
  }

  const data = load();

  const cle = genererCle();

  const licence = {
    cle,
    email,
    actif:true,
    date:new Date().toISOString()
  };

  data.actives.push(licence);
  save(data);

  envoyerEmail(email, cle);

  res.json(licence);
});

/* ======================================================
MODULE 09 — GET LICENCE PAR EMAIL
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
MODULE 10 — CREATE CHECKOUT SESSION
====================================================== */

app.post("/create-checkout-session", async (req,res)=>{

  if(!stripe){
    return res.status(500).json({error:"Stripe non configuré"});
  }

  const { email } = req.body;

  if(!email){
    return res.status(400).json({error:"Email requis"});
  }

  try{

    const session = await stripe.checkout.sessions.create({

      payment_method_types:["card"],
      mode:"payment",
      customer_email: email,

      line_items:[
        {
          price_data:{
            currency:"cad",
            product_data:{ name:"Licence VPIJLR" },
            unit_amount:1000
          },
          quantity:1
        }
      ],

      success_url:"https://jlr1959.github.io/Interface/success.html",
      cancel_url:"https://jlr1959.github.io/Interface/cancel.html"

    });

    res.json({url:session.url});

  }catch(e){
    console.log("❌ Stripe error:", e.message);
    res.status(500).json({error:e.message});
  }

});

/* ======================================================
MODULE 11 — WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({type:"application/json"}),
  async (req,res)=>{

    if(!stripe){
      return res.json({received:true});
    }

    const sig = req.headers["stripe-signature"];

    let event;

    try{
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    }catch(err){
      console.log("❌ Webhook error:", err.message);
      return res.status(400).send("Webhook Error");
    }

    if(event.type === "checkout.session.completed"){

      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email;

      if(!email){
        console.log("❌ Email manquant webhook");
        return res.json({received:true});
      }

      const data = load();

      const cle = genererCle();

      data.actives.push({
        cle,
        email,
        actif:true,
        date:new Date().toISOString()
      });

      save(data);

      envoyerEmail(email, cle);
    }

    res.json({received:true});
});

/* ======================================================
MODULE 12 — TEST EMAIL
====================================================== */

app.get("/test-email", async (req,res)=>{

  try{

    await envoyerEmail(
      process.env.EMAIL_USER,
      "AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE-FFFFFF-GGGGGG"
    );

    res.send("EMAIL OK (ou tentative envoyée)");

  }catch(e){

    res.send("EMAIL ERROR : " + e.message);

  }

});

/* ======================================================
MODULE 13 — START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR FINAL PORT",PORT);
});
