// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import fs from "fs";

const app = express();

// ==============================
// MODULE 02 - CORS
// ==============================
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","*");
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  next();
});

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ADMIN_KEY = process.env.ADMIN_KEY;

// ==============================
// MODULE 03 - ROOT
// ==============================
app.get("/", (req,res)=>{
  res.send("SERVER OK");
});

// ==============================
// MODULE 04 - DB
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

const users = load();

// ==============================
// MODULE 05 - ADMIN LIST
// ==============================
app.get("/admin/users",(req,res)=>{

  if(req.headers["admin-key"] !== ADMIN_KEY){
    return res.status(403).json({error:"forbidden"});
  }

  res.json(Array.from(users.values()));
});

// ==============================
// MODULE 06 - RESET MACHINES
// ==============================
app.post("/admin/reset-machines",(req,res)=>{

  if(req.headers["admin-key"] !== ADMIN_KEY){
    return res.status(403).json({error:"forbidden"});
  }

  const { email } = req.body;

  const user = users.get(email);

  if(!user){
    return res.status(404).json({error:"not found"});
  }

  user.machines = [];
  save();

  res.json({success:true});
});

// ==============================
// MODULE 07 - DELETE USER
// ==============================
app.post("/admin/delete",(req,res)=>{

  if(req.headers["admin-key"] !== ADMIN_KEY){
    return res.status(403).json({error:"forbidden"});
  }

  const { email } = req.body;

  users.delete(email);
  save();

  res.json({success:true});
});

// ==============================
// MODULE 08 - START
// ==============================
app.listen(process.env.PORT || 3000, ()=>{
  console.log("SERVER RUNNING");
});
