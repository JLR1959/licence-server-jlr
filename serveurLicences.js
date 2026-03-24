/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

/* ======================================================
MODULE 02
INIT
====================================================== */

const app = express();
app.use(cors());

/* ======================================================
MODULE 03
STRIPE CONFIG (ENV RENDER)
====================================================== */

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ======================================================
MODULE 04
FICHIERS
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");
const LOG_FILE = path.join(__dirname, "logs.txt");

/* ======================================================
MODULE 05
LOGS
====================================================== */

function addLog(message) {
  const entry = `[${new Date().toLocaleString()}] ${message}`;
  console.log(entry);
  try {
    fs.appendFileSync(LOG_FILE, entry + "\n");
  } catch (e) {}
}

/* ======================================================
MODULE 06
INIT DATA
====================================================== */

function initData() {
  try {
    JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ actives: [] }, null, 2));
  }
}

initData();

/* ======================================================
MODULE 07
GENERATION CLE
====================================================== */

function genererCleLicence() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function bloc() {
    let r = "";
    for (let i = 0; i < 6; i++) {
      r += chars[Math.floor(Math.random() * chars.length)];
    }
    return r;
  }

  return [
    bloc(), bloc(), bloc(),
    bloc(), bloc(), bloc(),
    bloc()
  ].join("-");
}

/* ======================================================
MODULE 08
ENREGISTRER LICENCE
====================================================== */

function enregistrerLicence(infos) {

  let data;

  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    data = { actives: [] };
  }

  data.actives.push({
    cle: infos.cle,
    logiciel: "VPIJLR 2026",
    email: infos.email,
    dateActivation: new Date().toISOString(),
    statut: "actif"
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  addLog("Licence créée : " + infos.cle);
}

/* ======================================================
MODULE 09
WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      addLog("❌ Webhook invalide");
      return res.sendStatus(400);
    }

    if (event.type === "checkout.session.completed") {

      const session = event.data.object;

      const email = session.customer_details?.email;

      addLog("💰 Paiement Stripe : " + email);

      const cle = genererCleLicence();

      enregistrerLicence({ cle, email });

      addLog("✅ Licence générée : " + cle);
    }

    res.json({ received: true });
});

/* ======================================================
MODULE 10
JSON PARSER (APRES WEBHOOK)
====================================================== */

app.use(express.json());

/* ======================================================
MODULE 11
ROUTES BASE
====================================================== */

app.get("/ping", (req, res) => {
  res.send("pong");
});

/* ======================================================
MODULE 12
ROUTE LICENCE (CRITIQUE)
====================================================== */

app.get("/licence/:email", (req, res) => {

  const email = req.params.email;

  try {

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    const licence = data.actives.find(l => l.email === email);

    if (!licence) {
      return res.status(404).json({ error: "Licence introuvable" });
    }

    res.json({ cle: licence.cle });

  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }

});

/* ======================================================
MODULE 13
START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  addLog("Serveur démarré sur port " + PORT);
});
