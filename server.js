// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import { Resend } from "resend";
import fs from "fs";

const app = express();

// ⚠️ STRIPE RAW BODY
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// MODULE 02 - CORS
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
  next();
});

// ==============================
// MODULE 03 - DATABASE (PERSISTENT)
// ==============================
const DB_FILE = "./licences.json";

function loadDB(){
  try{
    const data = fs.readFileSync(DB_FILE);
    return new Map(JSON.parse(data));
  }catch{
    return new Map();
  }
}

function saveDB(){
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(Array.from(users.entries()))
  );
}

const users = loadDB();

// ==============================
// MODULE 04 - LOG SYSTEM
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
// MODULE 05 - LICENCE GENERATOR
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
// MODULE 06 - EMAIL
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
        <p>VPIJLR 2026 activé</p>
        <a href="https://jlr1959.github.io/VPIJLR-logiciel-client/">Accéder au logiciel</a>
      `
    });

    addLog("ok","Email envoyé - " + email);

  }catch(e){
    addLog("error","Erreur email - " + email);
  }
}

// ==============================
// MODULE 07 - WEBHOOK STRIPE
// ==============================
app.post("/webhook", (req, res) => {

  const signature = req.headers["stripe-signature"];

  let event;

  try{
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
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

    addLog("info","Paiement confirmé - " + email);

    if(users.has(email)){
      addLog("info","Déjà actif - " + email);
      return res.json({ received:true });
    }

    const licence = generateLicense();

    const user = {
      email,
      licence,
      status: "VPIJLR 2026 activé",
      active: true,
      createdAt: new Date().toISOString()
    };

    users.set(email, user);
    saveDB();

    addLog("ok","Licence générée - " + email);

    sendEmail(email, licence);
  }

  return res.json({ received:true });
});

// ==============================
// MODULE 08 - IMPORT STRIPE 🔥
// ==============================
app.get("/import-stripe", async (req, res) => {

  try{

    const sessions = await stripe.checkout.sessions.list({
      limit: 20
    });

    let imported = [];

    for(const s of sessions.data){

      const email =
        s.customer_details?.email ||
        s.customer_email;

      if(!email) continue;
      if(users.has(email)) continue;

      const licence = generateLicense();

      const user = {
        email,
        licence,
        status: "VPIJLR 2026 activé",
        active: true,
        createdAt: new Date().toISOString(),
        source: "import-stripe"
      };

      users.set(email, user);
      saveDB();

      addLog("ok","Import licence - " + email);

      imported.push(user);
    }

    res.json(imported);

  }catch(e){
    res.status(500).json({ error:e.message });
  }
});

// ==============================
// MODULE 09 - ACTIVATE (SUCCESS PAGE)
// ==============================
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

  addLog("ok","Licence affichée - " + email);

  return res.json(user);
});

// ==============================
// MODULE 10 - CHECK ACCESS
// ==============================
app.post("/check-access", (req, res) => {

  const { email } = req.body;

  const user = users.get(email);

  if(!user || !user.active){
    addLog("error","Accès refusé - " + email);
    return res.status(403).json({ error:"refusé" });
  }

  addLog("ok","Accès SaaS - " + email);

  return res.json({
    success:true,
    licence:user.licence,
    status:user.status
  });
});

// ==============================
// MODULE 11 - LOGS LIVE
// ==============================
app.get("/logs", (req, res) => {
  res.json(logs);
});

// ==============================
// MODULE 12 - HEARTBEAT
// ==============================
setInterval(()=>{
  addLog("info","Serveur actif");
},5000);

// ==============================
// MODULE 13 - ROOT
// ==============================
app.get("/", (req, res) => {
  res.send("OK");
});

// ==============================
// MODULE 14 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Serveur prêt");
  addLog("ok","Serveur démarré");
});
