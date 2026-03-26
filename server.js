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
// MODULE 05 - PRICE MAP
// ==============================
const PRICE_MAP = {
  "price_1TAz5VQUeVbFaSLwnwBkGeDT": {type:"lifetime", max:5},
  "price_1TAylfQUeVbFaSLwtxWaHsKD": {type:"lifetime", max:1},

  "price_1TAyiyQUeVbFaSLwykidDo8I": {type:"annuel", max:5},
  "price_1TAyhzQUeVbFaSLwLoA9juzC": {type:"annuel", max:1},

  "price_1TAyevQUeVbFaSLwsGmvuiSV": {type:"mensuel", max:5},
  "price_1TAycBQUeVbFaSLw9MW21kXu": {type:"mensuel", max:1}
};

// ==============================
// MODULE 06 - LICENCE
// ==============================
function generateLicence(){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const block=()=>Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return Array.from({length:7},block).join("-");
}

// ==============================
// MODULE 07 - ACTIVATE SESSION 🔥
// ==============================
app.post("/activate-session", async (req,res)=>{

  try{

    const { session_id } = req.body;

    const session = await stripe.checkout.sessions.retrieve(
      session_id,
      { expand:["line_items"] }
    );

    const priceId = session.line_items.data[0].price.id;
    const config = PRICE_MAP[priceId];

    if(!config){
      return res.status(400).json({error:"price inconnu"});
    }

    const email = session.customer_details?.email || session.customer_email;

    let expiresAt = null;

    if(config.type === "mensuel"){
      expiresAt = new Date(Date.now() + 30*86400000);
    }

    if(config.type === "annuel"){
      expiresAt = new Date(Date.now() + 365*86400000);
    }

    let user = users.get(email);

    if(!user){

      user = {
        email,
        licence: generateLicence(),
        type: config.type,
        maxMachines: config.max,
        machines: [],
        expiresAt,
        createdAt: new Date().toISOString()
      };

      users.set(email, user);
      save();

      console.log("LICENCE CRÉÉE:", email);
    }

    res.json(user);

  }catch(err){
    console.log("ERROR:", err.message);
    res.status(500).json({error:"activation fail"});
  }
});

// ==============================
// MODULE 08 - CHECK ACCESS 🔥
// ==============================
app.post("/check-access",(req,res)=>{

  const { email, machineId } = req.body;
  const user = users.get(email);

  if(!user){
    return res.status(403).json({error:"no licence"});
  }

  if(user.expiresAt && new Date() > new Date(user.expiresAt)){
    return res.status(403).json({error:"expired"});
  }

  if(!user.machines.includes(machineId)){

    if(user.machines.length >= user.maxMachines){
      return res.status(403).json({error:"limit reached"});
    }

    user.machines.push(machineId);
    save();
  }

  res.json({
    success:true,
    licence:user.licence
  });
});

// ==============================
// MODULE 09 - START
// ==============================
app.listen(process.env.PORT || 3000, ()=>{
  console.log("SERVER RUNNING");
});
