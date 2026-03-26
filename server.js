// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import { Resend } from "resend";
import fs from "fs";

const app = express();

// ==============================
// MODULE 02 - ENV VALIDATION 🔐
// ==============================
function requireEnv(name){
  const value = process.env[name];
  if(!value){
    console.error(`❌ VARIABLE MANQUANTE: ${name}`);
    process.exit(1);
  }
  return value;
}

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");
const RESEND_API_KEY = requireEnv("RESEND_API_KEY");

// ==============================
// MODULE 03 - BODY PARSER
// ==============================
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ==============================
// MODULE 04 - INIT SERVICES
// ==============================
const stripe = new Stripe(STRIPE_SECRET_KEY);
const resend = new Resend(RESEND_API_KEY);

// ==============================
// MODULE 05 - CORS
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
  next();
});

// ==============================
// MODULE 06 - DATABASE
// ==============================
const DB_FILE = "./licences.json";

function loadDB(){
  try{
    if(!fs.existsSync(DB_FILE)){
      fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }
    return new Map(JSON.parse(fs.readFileSync(DB_FILE)));
  }catch{
    return new Map();
  }
}

function saveDB(){
  fs.writeFileSync(DB_FILE, JSON.stringify(Array.from(users.entries()), null, 2));
}

const users = loadDB();

// ==============================
// MODULE 07 - PRICE MAPPING 🔥
// ==============================
const PRICE_MAP = {
  "price_1TAz5VQUeVbFaSLwnwBkGeDT": "lifetime",
  "price_1TAylfQUeVbFaSLwtxWaHsKD": "lifetime",

  "price_1TAyiyQUeVbFaSLwykidDo8I": "annuel",
  "price_1TAyhzQUeVbFaSLwLoA9juzC": "annuel",

  "price_1TAyevQUeVbFaSLwsGmvuiSV": "mensuel",
  "price_1TAycBQUeVbFaSLw9MW21kXu": "mensuel"
};

// ==============================
// MODULE 08 - LOG
// ==============================
function addLog(type, message){
  console.log(`[${type}] ${message}`);
}

// ==============================
// MODULE 09 - LICENCE GENERATOR
// ==============================
function generateLicense() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const block = () =>
    Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return Array.from({ length: 7 }, block).join("-");
}

// ==============================
// MODULE 10 - WEBHOOK STRIPE
// ==============================
app.post("/webhook", async (req, res) => {

  let event;

  try{
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      STRIPE_WEBHOOK_SECRET
    );
  }catch{
    addLog("error","Webhook invalide");
    return res.status(400).send("error");
  }

  if(event.type === "checkout.session.completed"){

    const session = event.data.object;

    const fullSession = await stripe.checkout.sessions.retrieve(
      session.id,
      { expand: ["line_items"] }
    );

    const priceId = fullSession.line_items.data[0].price.id;

    if(!PRICE_MAP[priceId]){
      addLog("error","PRICE INCONNU: " + priceId);
      return res.json({ received:true });
    }

    const type = PRICE_MAP[priceId];

    const email =
      session.customer_details?.email ||
      session.customer_email;

    if(!email) return res.json({ received:true });
    if(users.has(email)) return res.json({ received:true });

    let expiresAt = null;

    if(type === "mensuel"){
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if(type === "annuel"){
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const licence = generateLicense();

    users.set(email, {
      email,
      licence,
      type,
      active:true,
      machineId: null,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null
    });

    saveDB();

    addLog("ok","Licence créée - " + email + " (" + type + ")");

    try{
      await resend.emails.send({
        from: "VPIJLR <activation@ton-app.com>",
        to: email,
        subject: "Licence activée",
        html: `<b>${licence}</b>`
      });
    }catch{
      addLog("error","Email fail " + email);
    }
  }

  res.json({ received:true });
});

// ==============================
// MODULE 11 - CHECK ACCESS 🔐
// ==============================
app.post("/check-access", (req, res) => {

  const { email, machineId } = req.body;
  const user = users.get(email);

  if(!user) return res.status(403).json({ error:"refusé" });

  if(user.expiresAt){
    if(new Date() > new Date(user.expiresAt)){
      user.active = false;
      saveDB();
      return res.status(403).json({ error:"expirée" });
    }
  }

  if(!user.machineId){
    user.machineId = machineId;
    saveDB();
  }

  if(user.machineId !== machineId){
    return res.status(403).json({
      error:"licence utilisée sur un autre appareil"
    });
  }

  if(!user.active){
    return res.status(403).json({ error:"refusé" });
  }

  return res.json({
    success:true,
    licence:user.licence,
    type:user.type
  });
});

// ==============================
// MODULE 12 - RESET MACHINE 🔥
// ==============================
app.post("/reset-machine", (req, res) => {

  const { email } = req.body;
  const user = users.get(email);

  if(!user){
    return res.status(404).json({ error:"introuvable" });
  }

  user.machineId = null;
  saveDB();

  addLog("ok","RESET machine - " + email);

  return res.json({
    success:true,
    message:"Machine réinitialisée"
  });
});

// ==============================
// MODULE 13 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING", PORT);
});
