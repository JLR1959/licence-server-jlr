const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

/* ======================================================
MODULE 01
CONFIG
====================================================== */

app.use(cors());
app.use(express.json());

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
  try {
    if (fs.existsSync(FILE)) {
      const data = fs.readFileSync(FILE);
      licences = JSON.parse(data);
      console.log("Licences chargées :", licences.length);
    }
  } catch (err) {
    console.error("Erreur chargement :", err);
  }
}

/* ======================================================
MODULE 04
SAUVEGARDE
====================================================== */

function sauvegarderLicences() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(licences, null, 2));
    console.log("Licences sauvegardées");
  } catch (err) {
    console.error("Erreur sauvegarde :", err);
  }
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
TEST SERVEUR
====================================================== */

app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

/* ======================================================
MODULE 07
AJOUT LICENCE MANUEL
====================================================== */

app.post("/ajouter-licence", (req, res) => {

  const licence = req.body;

  if (!licence || !licence.cle) {
    return res.json({ status: "erreur" });
  }

  licences.push(licence);
  sauvegarderLicences();

  res.json({ status: "ok" });
});

/* ======================================================
MODULE 08
LISTE LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(licences);
});

/* ======================================================
MODULE 09
SUPPRESSION
====================================================== */

app.post("/supprimer-licence", (req, res) => {

  const { cle } = req.body;

  licences = licences.filter(l => l.cle !== cle);

  sauvegarderLicences();

  res.json({ status: "ok" });
});

/* ======================================================
MODULE 10
WEBHOOK STRIPE (CORRIGÉ)
====================================================== */

app.post("/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {

  try {

    const event = JSON.parse(req.body.toString());

    if (event.type === "checkout.session.completed") {

      const email = event.data.object.customer_email || "client@inconnu.com";

      const cle = genererCle();

      const licence = {
        client: email,
        cle: cle,
        date: new Date().toISOString()
      };

      licences.push(licence);
      sauvegarderLicences();

      console.log("Licence Stripe créée :", licence);
    }

    res.json({ received: true });

  } catch (err) {

    console.error("Erreur webhook :", err);
    res.status(400).send("Erreur webhook");

  }

});

/* ======================================================
MODULE 11
DEMARRAGE
====================================================== */

chargerLicences();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur licence + Stripe prêt");
});
