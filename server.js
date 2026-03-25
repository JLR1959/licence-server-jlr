// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";

const app = express();
app.use(express.json());

// ==============================
// MODULE 02 - CORS
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ==============================
// MODULE 03 - DATABASE
// ==============================
const users = new Map();

// ==============================
// MODULE 04 - LOG SYSTEM 🔥
// ==============================
let logs = [];

function addLog(type, message){
  const log = {
    time: new Date().toISOString(),
    type,
    message
  };

  logs.push(log);

  if(logs.length > 300){
    logs.shift();
  }

  console.log(`[${type}] ${message}`);
}

// ==============================
// MODULE 05 - LICENCE
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
// MODULE 06 - ROOT
// ==============================
app.get("/", (req, res) => {
  addLog("info","Ping serveur");
  res.send("✅ Licence server actif");
});

// ==============================
// MODULE 07 - ACTIVATE
// ==============================
app.get("/activate", (req, res) => {

  const email = req.query.email;

  if (!email) {
    addLog("error","Activation sans email");
    return res.status(400).json({ error: "email manquant" });
  }

  addLog("info","Activation demandée - " + email);

  if (users.has(email)) {
    addLog("info","Déjà actif - " + email);
    return res.json(users.get(email));
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

  addLog("ok","Licence créée - " + email);

  return res.json(user);
});

// ==============================
// MODULE 08 - CHECK ACCESS
// ==============================
app.post("/check-access", (req, res) => {

  const { email } = req.body;

  if(!email){
    addLog("error","Check access sans email");
    return res.status(400).json({ error: "email requis" });
  }

  const user = users.get(email);

  if (!user || !user.active) {
    addLog("error","Accès refusé - " + email);
    return res.status(403).json({ error: "Accès refusé" });
  }

  addLog("ok","Accès SaaS - " + email);

  return res.json({
    success: true,
    licence: user.licence,
    status: user.status
  });
});

// ==============================
// MODULE 09 - LOGS LIVE 🔥
// ==============================
app.get("/logs", (req, res) => {
  res.json(logs);
});

// ==============================
// MODULE 10 - DEBUG USERS
// ==============================
app.get("/debug/users", (req, res) => {
  res.json(Array.from(users.values()));
});

// ==============================
// MODULE 11 - HEARTBEAT LIVE 🔥
// ==============================
setInterval(()=>{
  addLog("info","Serveur actif");
},5000);

// ==============================
// MODULE 12 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Serveur lancé sur port", PORT);
  addLog("ok","Serveur démarré");
});
