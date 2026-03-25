/* ======================================================
SERVEUR LICENCE JLR — VERSION COMPLETE STABLE
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
UTILS
====================================================== */

function logServeur(msg){
  console.log(new Date().toISOString(), "-", msg);
}

function chargerLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/* ======================================================
PING (RENDER)
====================================================== */

app.get("/ping", (req, res) => {
  res.send("OK");
});

/* ======================================================
ACCUEIL
====================================================== */

app.get("/", (req, res) => {
  res.send("SERVEUR LICENCE JLR ACTIF");
});

/* ======================================================
API STATUS
====================================================== */

app.get("/api", (req, res) => {
  const licences = chargerLicences();
  res.json({
    status: "OK",
    total: licences.length,
    date: new Date()
  });
});

/* ======================================================
GET LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(chargerLicences());
});

/* ======================================================
POST LICENCE (CREATE)
====================================================== */

app.post("/licences", (req, res) => {

  const licences = chargerLicences();
  const licence = req.body;

  if (!licence || !licence.cle) {
    return res.status(400).json({ erreur: "Licence invalide" });
  }

  // Anti doublon
  const existe = licences.find(l => l.cle === licence.cle);

  if (existe) {
    return res.status(400).json({ erreur: "Licence déjà existante" });
  }

  licence.actif = true;

  licences.push(licence);
  sauvegarderLicences(licences);

  logServeur("Licence créée: " + licence.cle);

  res.json({ succes: true, licence });

});

/* ======================================================
DELETE LICENCE
====================================================== */

app.delete("/licences/:cle", (req, res) => {

  const cle = req.params.cle;

  let licences = chargerLicences();

  licences = licences.filter(l => l.cle !== cle);

  sauvegarderLicences(licences);

  logServeur("Licence supprimée: " + cle);

  res.json({ succes: true });

});

/* ======================================================
TOGGLE ACTIF
====================================================== */

app.post("/toggle-licence", (req, res) => {

  let licences = chargerLicences();
  const { cle } = req.body;

  const index = licences.findIndex(l => l.cle === cle);

  if (index === -1) {
    return res.json({ ok: false });
  }

  licences[index].actif = !licences[index].actif;

  sauvegarderLicences(licences);

  res.json({
    ok: true,
    actif: licences[index].actif
  });

});

/* ======================================================
VALIDATION LICENCE (FRONTEND)
====================================================== */

app.post("/validate", (req, res) => {

  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.json({ status: "invalid" });
  }

  const licences = chargerLicences();

  const licence = licences.find(l => l.cle === licenseKey);

  if (!licence) {
    return res.json({ status: "invalid" });
  }

  // Désactivée
  if (licence.actif === false) {
    return res.json({ status: "disabled" });
  }

  // Expiration
  if (licence.expiration) {
    const today = new Date();
    const expiration = new Date(licence.expiration);

    if (expiration < today) {
      return res.json({ status: "expired" });
    }
  }

  res.json({
    status: "valid",
    licence
  });

});

/* ======================================================
VERIFIER ACCES (OPTION API)
====================================================== */

app.post("/verifier-acces", (req, res) => {

  const { cle } = req.body;
  const licences = chargerLicences();

  const licence = licences.find(l => l.cle === cle);

  if (!licence) {
    return res.json({ autorise: false });
  }

  res.json({
    autorise: licence.actif !== false,
    licence
  });

});

/* ======================================================
PORT (RENDER)
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logServeur("SERVEUR LICENCE JLR ACTIF sur port " + PORT);
});
