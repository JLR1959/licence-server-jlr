/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

/* ======================================================
MODULE 02
INITIALISATION
====================================================== */

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 03
SERVIR FRONTEND
====================================================== */

app.use(express.static(path.join(__dirname, ".")));

/* ======================================================
MODULE 04
FICHIER STOCKAGE LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

function chargerLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { disponibles: [], utilisees: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { disponibles: [], utilisees: [] };
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

let dataLicences = chargerLicences();

/* ======================================================
MODULE 05
ROUTE TEST
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur licence actif");
});

/* ======================================================
MODULE 06
API STATUS
====================================================== */

app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    disponibles: dataLicences.disponibles.length,
    utilisees: dataLicences.utilisees.length
  });
});

/* ======================================================
MODULE 07
AJOUT LICENCE
====================================================== */

app.post("/licences", (req, res) => {
  const { cle } = req.body;

  if (!cle) {
    return res.status(400).json({ erreur: "Licence invalide" });
  }

  dataLicences.disponibles.push(cle);
  sauvegarderLicences(dataLicences);

  res.json({ succes: true });
});

/* ======================================================
MODULE 08
VERIFIER LICENCE
====================================================== */

app.post("/verifier", (req, res) => {
  const { cle } = req.body;

  const licence = dataLicences.utilisees.find(l => l === cle);

  if (!licence) {
    return res.json({ valide: false });
  }

  res.json({ valide: true });
});

/* ======================================================
MODULE 09
ATTRIBUTION LICENCE
====================================================== */

function attribuerLicence() {
  if (dataLicences.disponibles.length === 0) return null;

  const licence = dataLicences.disponibles.shift();
  dataLicences.utilisees.push(licence);
  sauvegarderLicences(dataLicences);

  return licence;
}

/* ======================================================
MODULE 10
DOWNLOAD + LICENCE
====================================================== */

app.get("/download", (req, res) => {

  const licence = attribuerLicence();

  if (!licence) {
    return res.send("❌ Plus de licences disponibles");
  }

  res.send(`
    <h2>Licence générée</h2>
    <p>${licence}</p>
  `);
});

/* ======================================================
MODULE 11
DEMARRAGE
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur démarré sur port " + PORT);
});
