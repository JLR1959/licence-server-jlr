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
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if(req.method === "OPTIONS"){
    return res.sendStatus(200);
  }
  next();
});

// ==============================
// MODULE 03 - BODY PARSER
// ==============================
app.use(express.json());

// ==============================
// MODULE 04 - ENV
// ==============================
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);

// ==============================
// MODULE 05 - ROOT
// ==============================
app.get("/", (req, res) => {
  res.send("SERVER OK");
});

// ==============================
// MODULE 06 - DEBUG KEY
// ==============================
app.get("/debug-key", (req, res) => {
  res.json({
    hasKey: !!STRIPE_SECRET_KEY,
    prefix: STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.slice(0, 7) : null
  });
});

// ==============================
// MODULE 07 - DATABASE
// ==============================
const FILE = "./licences.json";

function loadDB(){
  try{
    if(!fs.existsSync(FILE)){
      fs.writeFileSync(FILE, "[]");
    }

    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);

    if(Array.isArray(parsed)){
      return new Map(parsed);
    }

    return new Map();
  }catch(e){
    console.log("DB LOAD ERROR:", e.message);
    return new Map();
  }
}

function saveDB(){
  try{
    fs.writeFileSync(FILE, JSON.stringify(Array.from(users.entries()), null, 2));
  }catch(e){
    console.log("DB SAVE ERROR:", e.message);
  }
}

const users = loadDB();

// ==============================
// MODULE 08 - PRICE MAP
// ==============================
const PRICE_MAP = {
  "price_1TAz5VQUeVbFaSLwnwBkGeDT": { type: "lifetime", maxMachines: 5 },
  "price_1TAylfQUeVbFaSLwtxWaHsKD": { type: "lifetime", maxMachines: 1 },

  "price_1TAyiyQUeVbFaSLwykidDo8I": { type: "annuel", maxMachines: 5 },
  "price_1TAyhzQUeVbFaSLwLoA9juzC": { type: "annuel", maxMachines: 1 },

  "price_1TAyevQUeVbFaSLwsGmvuiSV": { type: "mensuel", maxMachines: 5 },
  "price_1TAycBQUeVbFaSLw9MW21kXu": { type: "mensuel", maxMachines: 1 }
};

// ==============================
// MODULE 09 - LICENCE GENERATOR
// ==============================
function generateLicence(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const block = () =>
    Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return Array.from({ length: 7 }, block).join("-");
}

// ==============================
// MODULE 10 - EXPIRATION
// ==============================
function computeExpiresAt(type){
  if(type === "mensuel"){
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  if(type === "annuel"){
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

// ==============================
// MODULE 11 - DEBUG SESSION
// ==============================
app.get("/debug-session", async (req, res) => {
  try{
    const sessionId = req.query.id;

    if(!sessionId){
      return res.status(400).json({ error: "missing id" });
    }

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["line_items"] }
    );

    res.json({
      id: session.id,
      email: session.customer_details?.email || session.customer_email || null,
      priceId: session.line_items?.data?.[0]?.price?.id || null,
      payment_status: session.payment_status || null,
      status: session.status || null
    });
  }catch(e){
    res.status(500).json({ error: e.message });
  }
});

// ==============================
// MODULE 12 - ACTIVATE SESSION
// ==============================
app.post("/activate-session", async (req, res) => {
  try{
    const { session_id } = req.body;

    if(!session_id){
      return res.status(400).json({ error: "missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(
      session_id,
      { expand: ["line_items"] }
    );

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    if(!email){
      return res.status(400).json({ error: "email manquant" });
    }

    const priceId = session.line_items?.data?.[0]?.price?.id || null;

    if(!priceId){
      return res.status(400).json({ error: "price introuvable" });
    }

    const config = PRICE_MAP[priceId];

    if(!config){
      return res.status(400).json({ error: "price inconnu" });
    }

    let user = users.get(email);

    if(!user){
      user = {
        email,
        licence: generateLicence(),
        type: config.type,
        maxMachines: config.maxMachines,
        machines: [],
        expiresAt: computeExpiresAt(config.type),
        createdAt: new Date().toISOString()
      };

      users.set(email, user);
      saveDB();

      console.log("LICENCE CRÉÉE:", email, config.type, config.maxMachines);
    }else{
      console.log("LICENCE EXISTANTE:", email);
    }

    return res.json({
      email: user.email,
      licence: user.licence,
      type: user.type,
      maxMachines: user.maxMachines,
      expiresAt: user.expiresAt
    });

  }catch(e){
    console.log("ACTIVATE SESSION ERROR:", e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ==============================
// MODULE 13 - ACTIVATE BY EMAIL
// ==============================
app.get("/activate", (req, res) => {
  const email = req.query.email;

  if(!email){
    return res.status(400).json({ error: "email manquant" });
  }

  const user = users.get(email);

  if(!user){
    return res.status(404).json({ error: "not found" });
  }

  return res.json({
    email: user.email,
    licence: user.licence,
    type: user.type,
    maxMachines: user.maxMachines,
    expiresAt: user.expiresAt
  });
});

// ==============================
// MODULE 14 - CHECK ACCESS
// ==============================
app.post("/check-access", (req, res) => {
  const { email, machineId } = req.body;

  if(!email){
    return res.status(400).json({ error: "email manquant" });
  }

  if(!machineId){
    return res.status(400).json({ error: "machineId manquant" });
  }

  const user = users.get(email);

  if(!user){
    return res.status(403).json({ error: "no licence" });
  }

  if(user.expiresAt && new Date() > new Date(user.expiresAt)){
    return res.status(403).json({ error: "expired" });
  }

  if(!Array.isArray(user.machines)){
    user.machines = [];
  }

  if(!user.machines.includes(machineId)){
    if(user.machines.length >= user.maxMachines){
      return res.status(403).json({ error: "limit reached" });
    }

    user.machines.push(machineId);
    saveDB();
  }

  return res.json({
    success: true,
    licence: user.licence,
    type: user.type,
    machines: user.machines.length,
    maxMachines: user.maxMachines,
    expiresAt: user.expiresAt
  });
});

// ==============================
// MODULE 15 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SERVER RUNNING ON", PORT);
});
