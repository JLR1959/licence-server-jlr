const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

/* ======================================================
MODULE 01
CONFIG
====================================================== */

app.use(cors());

// ⚠️ IMPORTANT : on n'applique PAS express.json globalement
app.use((req, res, next) => {
  if (req.originalUrl === "/stripe-webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

const FILE = "licences.json";

/* ======================================================
MODULE 02
MEMOIRE
====================================================== */

let licences = [];

/* ======================================================
MODULE 03
CHARGEMENT
====================================================== */

function chargerLicences() {
  if (fs.existsSync(FILE)) {
    licences = JSON.parse(fs.readFileSync(FILE));
  }
}

/* ======================================================
MODULE 04
SAUVEGARDE
====================================================== */

function sauvegarderLicences() {
  fs.writeFileSync(FILE, JSON.stringify(licences, null, 2));
}

/* ======================================================
MODULE 05
GENERATEUR CLE
====================================================== */

function genererCle() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let cle = "";

  for (let i = 0; i < 5; i++) {
    let part = "";
    for (let j = 0; j < 5; j++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    cle += part;
    if (i < 4) cle += "-";
  }

  return cle;
}

/* ======================================================
MODULE 06
TEST
====================================================== */

app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

/* ======================================================
MODULE 07
LICENCES
====================================================== */

app.post("/ajouter-licence", (req, res) => {
  licences.push(req.body);
  sauvegarderLicences();
  res.json({ status: "ok" });
});

app.get("/licences", (req, res) => {
  res.json(licences);
});

app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body;
  licences = licences.filter(l => l.cle !== cle);
  sauvegarderLicences();
  res.json({ status: "ok" });
});

/* ======================================================
MODULE 08
WEBHOOK STRIPE (FINAL CORRECT)
====================================================== */

app.post("/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {

  try {

    const event = JSON.parse(req.body.toString());

    if (event.type === "checkout.session.completed") {

      const email = event.data.object.customer_email || "test@client.com";

      const cle = genererCle();

      const licence = {
        client: email,
        cle: cle,
        date: new Date().toISOString()
      };

      licences.push(licence);
      sauvegarderLicences();

      console.log("Licence créée :", licence);
    }

    res.json({ received: true });

  } catch (err) {
    console.error("Erreur webhook :", err);
    res.status(400).send("Erreur webhook");
  }

});

/* ======================================================
MODULE 09
DEMARRAGE
====================================================== */

chargerLicences();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur Stripe OK");
});
