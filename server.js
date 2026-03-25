/* ======================================================
SERVEUR LICENCE JLR — FINAL STABLE AVEC STRIPE SAFE
====================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

/* ======================================================
MODULE 00 — BASE
====================================================== */

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 01 — DATA
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
MODULE 02 — GENERATION CLE
====================================================== */

function genererCle(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bloc = () =>
    Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return [bloc(),bloc(),bloc(),bloc(),bloc(),bloc(),bloc()].join("-");
}

/* ======================================================
MODULE 03 — PING
====================================================== */

app.get("/ping",(req,res)=>res.send("pong"));

/* ======================================================
MODULE 04 — GET LICENCES
====================================================== */

app.get("/licences",(req,res)=>{
  const data = load();
  res.json(data.actives);
});

/* ======================================================
MODULE 05 — CREATE LICENCE (MANUEL / TEST)
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

  res.json(licence);
});

/* ======================================================
MODULE 06 — STRIPE SAFE LOAD
====================================================== */

let stripe = null;

try{
  if(process.env.STRIPE_SECRET_KEY){
    const Stripe = require("stripe");
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe chargé");
  }else{
    console.log("⚠️ Stripe désactivé (clé absente)");
  }
}catch(e){
  console.log("❌ Stripe error:", e.message);
}

/* ======================================================
MODULE 07 — CREATE CHECKOUT SESSION (SAFE)
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

      success_url:"https://jlr1959.github.io/licence-server-jlr/success.html",
      cancel_url:"https://jlr1959.github.io/licence-server-jlr/cancel.html"

    });

    res.json({url:session.url});

  }catch(e){
    console.log("❌ Stripe session error:", e.message);
    res.status(500).json({error:e.message});
  }

});

/* ======================================================
MODULE 08 — WEBHOOK (SAFE)
====================================================== */

app.post("/webhook-stripe", express.raw({type:"application/json"}), (req,res)=>{

  console.log("🔔 Webhook reçu");

  // volontairement simple pour éviter crash

  res.json({received:true});
});

/* ======================================================
MODULE 09 — START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("🚀 SERVEUR FINAL PORT",PORT);
});
