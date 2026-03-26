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

// ==============================
// MODULE 03 - BODY
// ==============================
app.use(express.json());

// ==============================
// MODULE 04 - STRIPE
// ==============================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ==============================
// MODULE 05 - ROOT
// ==============================
app.get("/", (req,res)=>{
  res.send("SERVER OK");
});

// ==============================
// MODULE 06 - DATABASE
// ==============================
const FILE = "./licences.json";

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
// MODULE 07 - PRICE MAP
// ==============================
const PRICE_MAP = {
  "price_1TAz5VQUeVbFaSLwnwBkGeDT": "lifetime_5",
  "price_1TAylfQUeVbFaSLwtxWaHsKD": "lifetime_1",

  "price_1TAyiyQUeVbFaSLwykidDo8I": "annuel_5",
  "price_1TAyhzQUeVbFaSLwLoA9juzC": "annuel_1",

  "price_1TAyevQUeVbFaSLwsGmvuiSV": "mensuel_5",
  "price_1TAycBQUeVbFaSLw9MW21kXu": "mensuel_1"
};

// ==============================
// MODULE 08 - LICENCE GENERATOR
// ==============================
function generateLicence(){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const block=()=>Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return Array.from({length:7},block).join("-");
}

// ==============================
// MODULE 09 - ACTIVATE SESSION 🔥
// ==============================
app.post("/activate-session", async (req,res)=>{

  try{

    const { session_id } = req.body;

    if(!session_id){
      return res.status(400).json({error:"missing session_id"});
    }

    const session = await stripe.checkout.sessions.retrieve(
      session_id,
      { expand:["line_items"] }
    );

    const priceId = session.line_items.data[0].price.id;

    if(!PRICE_MAP[priceId]){
      return res.status(400).json({error:"unknown price"});
    }

    const type = PRICE_MAP[priceId];

    const email = session.customer_details?.email || session.customer_email;

    if(!email){
      return res.status(400).json({error:"no email"});
    }

    let expiresAt = null;

    if(type.includes("mensuel")){
      expiresAt = new Date(Date.now() + 30 * 86400000);
    }

    if(type.includes("annuel")){
      expiresAt = new Date(Date.now() + 365 * 86400000);
    }

    // éviter doublon
    let user = users.get(email);

    if(!user){

      const licence = generateLicence();

      user = {
        email,
        licence,
        type,
        expiresAt,
        active:true,
        machineId:null,
        createdAt:new Date().toISOString()
      };

      users.set(email, user);
      save();

      console.log("✅ LICENCE CRÉÉE:", email, type);

    }else{
      console.log("ℹ️ LICENCE EXISTANTE:", email);
    }

    res.json({
      email:user.email,
      licence:user.licence,
      type:user.type,
      expiresAt:user.expiresAt
    });

  }catch(err){
    console.log("❌ ERROR:", err.message);
    res.status(500).json({error:"server error"});
  }

});

// ==============================
// MODULE 10 - ACTIVATE (fallback)
// ==============================
app.get("/activate",(req,res)=>{

  const email = req.query.email;
  const user = users.get(email);

  if(!user){
    return res.status(404).json({error:"not found"});
  }

  res.json({
    licence:user.licence,
    type:user.type,
    expiresAt:user.expiresAt
  });
});

// ==============================
// MODULE 11 - START
// ==============================
app.listen(process.env.PORT || 3000, ()=>{
  console.log("🚀 SERVER RUNNING");
});
