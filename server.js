// ==============================
import express from "express";
import Stripe from "stripe";
import fs from "fs";
import crypto from "crypto";

const app = express();

// ==============================
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;
const LICENCE_SECRET = process.env.LICENCE_SECRET;

// ==============================
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ==============================
const stripe = new Stripe(STRIPE_SECRET_KEY);

// ==============================
app.get("/", (req,res)=>{
  res.send("SERVER OK");
});

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

    const email=s.customer_details?.email || s.customer_email;

    if(!email) return res.json({received:true});
    if(users.has(email)) return res.json({received:true});

    const licence=gen();

    const data={
      email,
      licence,
      type:"lifetime",
      expiresAt:null
    };

    users.set(email,{
      ...data,
      signature:sign(data),
      active:true,
      machineId:null,
      createdAt:new Date().toISOString()
    });

    save();
  }

  res.json({received:true});
});

// ==============================
// ACTIVATE
// ==============================
app.get("/activate",(req,res)=>{
  const email=req.query.email;
  const u=users.get(email);

  if(!u){
    return res.status(404).json({error:"not found"});
  }

  res.json({
    licence:u.licence,
    type:u.type
  });
});

// ==============================
// CHECK
// ==============================
app.post("/check-access",(req,res)=>{

  const {email,machineId}=req.body;
  const u=users.get(email);

  if(!u){
    return res.status(403).json({error:"refusé"});
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
// ADMIN
// ==============================
app.get("/admin/users",(req,res)=>{

  const key=req.headers["admin-key"];

  if(key!==ADMIN_KEY){
    return res.status(403).json({error:"forbidden"});
  }

  res.json(Array.from(users.values()));
});

// ==============================
app.listen(process.env.PORT||3000,()=>{
  console.log("RUNNING");
});
