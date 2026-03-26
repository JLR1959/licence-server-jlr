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
    console.error("⛔ ARRÊT DU SERVEUR (SECURITÉ)");
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
// MODULE 06 - DATABASE SAFE
// ==============================
const DB_FILE = "./licences.json";

function loadDB(){
  try{
    if(!fs.existsSync(DB_FILE)){
      fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }

    const data = fs.readFileSync(DB_FILE);

    if(!data.length) return new Map();

    return new Map(JSON.parse(data));

  }catch(e){
    console.error("DB LOAD ERROR:", e);
    return new Map();
  }
}

function saveDB(){
  try{
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(Array.from(users.entries()), null, 2)
    );
  }catch(e){
    console.error("DB SAVE ERROR:", e);
  }
}

const users = loadDB();

// ==============================
// MODULE 07 - LOG SYSTEM
// ==============================
let logs = [];

function addLog(type, message){
  const log = {
    time: new Date().toISOString(),
    type,
    message
  };

  logs.push(log);
  if(logs.length > 300) logs.shift();

  console.log(`[${type}] ${message}`);
}

// ==============================
// MODULE 08 - LICENCE GENERATOR
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
// MODULE 09 - EMAIL
// ==============================
async function sendEmail(email, licence){
  try{
    await resend.emails.send({
      from: "VPIJLR <activation@ton-app.com>",
      to: email,
      subject: "Licence VPIJLR 2026 activée",
      html: `
        <h2>Licence activée ✔</h2>
        <p><b>${licence}</b></p>
        <p>Type: licence active</p>
        <a href="https://jlr1959.github.io/VPIJLR-logiciel-client/">Accéder au logiciel</a>
      `
    });

    addLog("ok","Email envoyé - " + email);

  }catch(e){
    console.error(e);
    addLog("error","Erreur email - " + email);
  }
}

// ==============================
// MODULE 10 - WEBHOOK STRIPE (AVEC DURÉE)
// ==============================
app.post("/webhook", (req, res) => {

  let event;

  try{
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      STRIPE_WEBHOOK_SECRET
    );
  }catch(err){
    addLog("error","Signature Stripe invalide");
    return res.status(400).send("Webhook Error");
  }

  addLog("info","Webhook reçu: " + event.type);

  if(event.type === "checkout.session.completed"){

    const session = event.data.object;

    const email =
      session.customer_details?.email ||
      session.customer_email;

    if(!email){
      addLog("error","Email Stripe manquant");
      return res.json({ received:true });
    }

    if(users.has(email)){
      addLog("info","Déjà actif - " + email);
      return res.json({ received:true });
    }

    // 🔥 TYPE LICENCE (envoyé depuis Stripe metadata)
    const type = session.metadata?.type || "lifetime";

    let expiresAt = null;

    if(type === "mensuel"){
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if(type === "annuel"){
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const licence = generateLicense();

    const user = {
      email,
      licence,
      type,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null
    };

    users.set(email, user);
    saveDB();

    addLog("ok","Licence générée - " + email + " (" + type + ")");

    sendEmail(email, licence);
  }

  return res.json({ received:true });
});

// ==============================
// MODULE 11 - ROUTES + CHECK EXPIRATION
// ==============================
app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/logs", (req, res) => {
  res.json(logs);
});

app.get("/activate", (req, res) => {

  const email = req.query.email;

  if(!email){
    addLog("error","Activation sans email");
    return res.status(400).json({ error:"email manquant" });
  }

  const user = users.get(email);

  if(!user){
    addLog("error","Licence non trouvée - " + email);
    return res.status(404).json({ error:"not found" });
  }

  return res.json(user);
});

app.post("/check-access", (req, res) => {

  const { email } = req.body;
  const user = users.get(email);

  if(!user){
    addLog("error","Accès refusé - " + email);
    return res.status(403).json({ error:"refusé" });
  }

  // 🔥 expiration automatique
  if(user.expiresAt){

    const now = new Date();
    const expire = new Date(user.expiresAt);

    if(now > expire){
      user.active = false;
      saveDB();

      addLog("error","Licence expirée - " + email);

      return res.status(403).json({ error:"expirée" });
    }
  }

  if(!user.active){
    addLog("error","Accès refusé - " + email);
    return res.status(403).json({ error:"refusé" });
  }

  addLog("ok","Accès autorisé - " + email);

  return res.json({
    success:true,
    licence:user.licence,
    type:user.type,
    expiresAt:user.expiresAt
  });
});

// ==============================
// MODULE 12 - HEARTBEAT
// ==============================
setInterval(()=>{
  addLog("info","Serveur actif");
},5000);

// ==============================
// MODULE 13 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Serveur prêt sur", PORT);
  addLog("ok","Serveur démarré");
});
