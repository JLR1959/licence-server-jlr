const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 01
FICHIER
====================================================== */

const FILE = "licences.json";

/* ======================================================
MODULE 02
CHARGEMENT AU DEMARRAGE
====================================================== */

let licences = [];
let demandes = [];

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
MODULE 03
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
MODULE 04
ROUTES
====================================================== */

// TEST
app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

// DEMANDES
app.post("/demande-activation", (req, res) => {
  demandes.push(req.body);
  res.json({ status: "ok" });
});

app.get("/demandes", (req, res) => {
  res.json(demandes);
});

// AJOUT LICENCE
app.post("/ajouter-licence", (req, res) => {
  licences.push(req.body);
  sauvegarderLicences();
  res.json({ status: "ok" });
});

// LISTE LICENCES
app.get("/licences", (req, res) => {
  res.json(licences);
});

// SUPPRIMER
app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body;
  licences = licences.filter(l => l.cle !== cle);
  sauvegarderLicences();
  res.json({ status: "ok" });
});

/* ======================================================
MODULE 05
DEMARRAGE
====================================================== */

chargerLicences();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt");
});
