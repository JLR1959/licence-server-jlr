/* ======================================================
SERVEUR LICENCE JLR — RESEND FINAL STABLE
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
ROOT
====================================================== */

app.get("/", (req,res)=>{
  res.send("SERVEUR OK RESEND");
});

/* ======================================================
EMAIL RESEND (REMPLACE GMAIL)
====================================================== */

async function envoyerEmail(email, cle){

  try{

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "VPIJLR <onboarding@resend.dev>",
        to: email,
        subject: "Votre licence VPIJLR",
        html: `
          <p>Bonjour,</p>
          <p>Voici votre clé licence :</p>
          <h2>${cle}</h2>
        `
      })
    });

    const text = await response.text();

    console.log("📧 RESEND:", text);

  }catch(e){

    console.log("❌ EMAIL ERROR:", e.message);

  }
}

/* ======================================================
DATA
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
CLE
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
PING
====================================================== */

app.get("/ping",(req,res)=>res.send("pong"));

/* ======================================================
LICENCES
====================================================== */

app.get("/licences",(req,res)=>{
  res.json(load().actives);
});

app.post("/licences",(req,res)=>{

  const { email } = req.body;

  if(!email){
    return res.status(400).json({error:"Email requis"});
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

  res.json({cle});
});

/* ======================================================
STRIPE
====================================================== */

let stripe = null;

try{
  if(process.env.STRIPE_SECRET_KEY){
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
}catch{}

/* ======================================================
WEBHOOK
====================================================== */

app.post("/webhook-stripe",
  express.raw({type:"application/json"}),
  async (req,res)=>{

    if(!stripe) return res.json({received:true});

    let event;

    try{
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    }catch{
      return res.status(400).send("Webhook Error");
    }

    if(event.type === "checkout.session.completed"){

      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email;

      if(email){

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
    }

    res.json({received:true});
});

/* ======================================================
TEST EMAIL
====================================================== */

app.get("/test-email", async (req,res)=>{

  await envoyerEmail(
    "TON_EMAIL_ICI@gmail.com",
    "AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE-FFFFFF-GGGGGG"
  );

  res.send("EMAIL TEST ENVOYÉ");
});

/* ======================================================
START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR RESEND OK");
});
