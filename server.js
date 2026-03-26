// ==============================
import express from "express";
import Stripe from "stripe";
import fs from "fs";

const app = express();

// ==============================
// CORS
// ==============================
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","*");
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  next();
});

// ==============================
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ==============================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
// PRICE MAP 🔥 TES 6 LICENCES
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
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }catch{
    return res.status(400).send("error");
  }

  if(event.type==="checkout.session.completed"){

    const session = event.data.object;

    const full = await stripe.checkout.sessions.retrieve(
      session.id,
      { expand:["line_items"] }
    );

    const priceId = full.line_items.data[0].price.id;

    if(!PRICE_MAP[priceId]){
      console.log("PRICE INCONNU:", priceId);
      return res.json({received:true});
    }

    const type = PRICE_MAP[priceId];

    const email = session.customer_details?.email || session.customer_email;

    let expiresAt = null;

    if(type.includes("mensuel")){
      expiresAt = new Date(Date.now() + 30*86400000);
    }

    if(type.includes("annuel")){
      expiresAt = new Date(Date.now() + 365*86400000);
    }

    const licence = gen();

    users.set(email,{
      email,
      licence,
      type,
      expiresAt,
      active:true,
      machineId:null,
      createdAt:new Date().toISOString()
    });

    save();

    console.log("LICENCE CRÉÉE:", email, type);
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
    type:u.type,
    expiresAt:u.expiresAt
  });
});

// ==============================
app.listen(process.env.PORT||3000,()=>{
  console.log("RUNNING");
});
