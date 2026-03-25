/* ======================================================
SERVEUR LICENCE JLR — FINAL COMPLET (MULTI LICENCES)
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

/* ======================================================
MODULE 00 — CORS
====================================================== */

app.use(cors());

/* ======================================================
MODULE 01 — CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ======================================================
MODULE 02 — EMAIL (OFFICE365)
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
MODULE 04 — GENERATION CLE
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");

  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
MODULE 05 — ANTI DOUBLON
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

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        null;

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
MODULE 08 — JSON
====================================================== */

app.use(express.json());

/* ======================================================
MODULE 09 — CREATE CHECKOUT SESSION (MULTI PRIX)
====================================================== */

app.post("/create-checkout-session", async (req, res) => {

  const { email, type } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: "Email et type requis" });
  }

  // 🔥 TES 6 PRIX STRIPE À METTRE ICI
  const PRICES = {

    mensuelle_1: "price_xxxxx1",
    annuelle_1: "price_xxxxx2",
    achat_1: "price_xxxxx3",

    mensuelle_2: "price_xxxxx4",
    annuelle_2: "price_xxxxx5",
    achat_2: "price_xxxxx6"

  };

  const priceId = PRICES[type];

  if (!priceId) {
    return res.status(400).json({ error: "Type licence invalide" });
  }

  try {

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["card"],
      mode: "payment",

      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],

      success_url: "https://jlr1959.github.io/licence-server-jlr/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://jlr1959.github.io/licence-server-jlr/cancel.html"

    });

    res.json({ url: session.url });

  } catch (error) {

    console.log("❌ STRIPE ERROR :", error.message);
    res.status(500).json({ error: error.message });

  }

});

/* ======================================================
MODULE 10 — GET LICENCE
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
MODULE 11 — SESSION STRIPE
====================================================== */

app.get("/session/:id", async (req,res)=>{

  try{

    const session = await stripe.checkout.sessions.retrieve(req.params.id);

    let email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    if(!email){
      console.log("❌ EMAIL INTROUVABLE SESSION");
      return res.status(404).json({error:"Email introuvable"});
    }

    res.json({ email });

  }catch(e){

    console.log("❌ SESSION ERROR :", e.message);
    res.status(500).json({error:"Session Stripe invalide"});

  }

});

/* ======================================================
MODULE 12 — TEST EMAIL
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
MODULE 13 — START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR ACTIF PORT",PORT);
});
