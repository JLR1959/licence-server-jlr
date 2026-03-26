// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import { Resend } from "resend";
import fs from "fs";
import crypto from "crypto";

const app = express();

// ==============================
// MODULE 02 - ENV
// ==============================
function requireEnv(name){
  const v = process.env[name];
  if(!v){
    console.error("Missing:", name);
    process.exit(1);
  }
  return v;
}

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");
const RESEND_API_KEY = requireEnv("RESEND_API_KEY");
const ADMIN_KEY = requireEnv("ADMIN_KEY");
const LICENCE_SECRET = requireEnv("LICENCE_SECRET");

// ==============================
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ==============================
const stripe = new Stripe(STRIPE_SECRET_KEY);
const resend = new Resend(RESEND_API_KEY);

// ==============================
app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","*");
  next();
});

// ==============================
// ROOT FIX 🔥
// ==============================
app.get("/", (req,res)=>{
  res.send("✅ VPIJLR LICENCE SERVER RUNNING");
});

// ==============================
// DB
// ==============================
const FILE="./licences.json";

function load(){
  try{
    if(!fs.existsSync(FILE)){
      fs.writeFileSync(FILE,"[]");
    }
    return new Map(JSON.parse(fs.readFileSync(FILE)));
  }catch{
    return new Map();
  }
}

function save(){
  fs.writeFileSync(FILE, JSON.stringify(Array.from(users.entries()),null,2));
}

const users=load();

// ==============================
// PRICE MAP
// ==============================
const PRICE_MAP = {
  "price_1TAz5VQUeVbFaSLwnwBkGeDT":"lifetime",
  "price_1TAylfQUeVbFaSLwtxWaHsKD":"lifetime",
  "price_1TAyiyQUeVbFaSLwykidDo8I":"annuel",
  "price_1TAyhzQUeVbFaSLwLoA9juzC":"annuel",
  "price_1TAyevQUeVbFaSLwsGmvuiSV":"mensuel",
  "price_1TAycBQUeVbFaSLw9MW21kXu":"mensuel"
};

// ==============================
function sign(data){
  return crypto.createHmac("sha256",LICENCE_SECRET)
    .update(JSON.stringify(data))
    .digest("hex");
}

// ==============================
function gen(){
  const c="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const b=()=>Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join("");
  return Array.from({length:7},b).join("-");
}

// ==============================
// WEBHOOK
// ==============================
app.post("/webhook", async (req,res)=>{

  let event;

  try{
    event=stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      STRIPE_WEBHOOK_SECRET
    );
  }catch{
    return res.status(400).send("error");
  }

  if(event.type==="checkout.session.completed"){

    const s=event.data.object;

    const full=await stripe.checkout.sessions.retrieve(
      s.id,{expand:["line_items"]}
    );

    const priceId=full.line_items.data[0].price.id;

    if(!PRICE_MAP[priceId]) return res.json({received:true});

    const type=PRICE_MAP[priceId];

    const email=s.customer_details?.email || s.customer_email;

    if(!email || users.has(email)) return res.json({received:true});

    let expiresAt=null;

    if(type==="mensuel"){
      expiresAt=new Date(Date.now()+30*86400000);
    }

    if(type==="annuel"){
      expiresAt=new Date(Date.now()+365*86400000);
    }

    const licence=gen();

    const data={email,licence,type,expiresAt};

    users.set(email,{
      ...data,
      signature:sign(data),
      active:true,
      machineId:null,
      createdAt:new Date().toISOString()
    });

    save();

    try{
      await resend.emails.send({
        from:"VPIJLR <activation@ton-app.com>",
        to:email,
        subject:"Licence activée",
        html:`<b>${licence}</b>`
      });
    }catch{}
  }

  res.json({received:true});
});

// ==============================
// ACTIVATE
// ==============================
app.get("/activate",(req,res)=>{
  const email=req.query.email;
  const u=users.get(email);

  if(!email) return res.status(400).json({error:"email"});
  if(!u) return res.status(404).json({error:"not found"});

  res.json({
    licence:u.licence,
    type:u.type,
    expiresAt:u.expiresAt
  });
});

// ==============================
// CHECK
// ==============================
app.post("/check-access",(req,res)=>{

  const {email,machineId}=req.body;
  const u=users.get(email);

  if(!u) return res.status(403).json({error:"refusé"});

  if(sign({
    email:u.email,
    licence:u.licence,
    type:u.type,
    expiresAt:u.expiresAt
  })!==u.signature){
    return res.status(403).json({error:"corrompue"});
  }

  if(u.expiresAt && new Date()>new Date(u.expiresAt)){
    u.active=false;
    save();
    return res.status(403).json({error:"expirée"});
  }

  if(!u.machineId){
    u.machineId=machineId;
    save();
  }

  if(u.machineId!==machineId){
    return res.status(403).json({error:"autre appareil"});
  }

  res.json({success:true,licence:u.licence});
});

// ==============================
app.listen(process.env.PORT||3000,()=>{
  console.log("RUNNING");
});
