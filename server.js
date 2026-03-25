console.log("VERSION TEST EMAIL OK");
/* ======================================================
SERVEUR LICENCE JLR — VERSION COMPLETE COMPATIBLE FRONT
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

function normaliserStructure(data) {
  if (Array.isArray(data)) {
    return { actives: data };
  }

  if (data && Array.isArray(data.actives)) {
    return data;
  }

  return { actives: [] };
}

function chargerData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { actives: [] };
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return normaliserStructure(parsed);
  } catch {
    return { actives: [] };
  }
}

function sauvegarderData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(normaliserStructure(data), null, 2), "utf8");
}

/* ======================================================
PING (RENDER)
====================================================== */

app.get("/ping", (req, res) => {
  res.send("pong");
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
  const data = chargerData();

  res.json({
    status: "OK",
    total: data.actives.length,
    date: new Date()
  });
});

/* ======================================================
GET LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  const data = chargerData();
  res.json(data);
});

/* ======================================================
POST LICENCE (CREATE)
====================================================== */

app.post("/licences", (req, res) => {

  const data = chargerData();
  const { client, email, type, dateActivation, dateExpiration } = req.body;

  const cle = genererCleLicence();

  const existe = data.actives.find(l => l.cle === cle);

  if (existe) {
    return res.status(400).json({ erreur: "Collision licence, recommencez" });
  }

  const licence = {
    cle,
    client: client || "Client",
    email: email || "",
    type: type || "achat_1",
    dateActivation: dateActivation || new Date().toISOString().split("T")[0],
    dateExpiration: dateExpiration || "",
    actif: true
  };

  data.actives.push(licence);
  sauvegarderData(data);

  logServeur("Licence créée: " + licence.cle);

  res.json({ success: true, cle: licence.cle, licence });

});

/* ======================================================
DELETE LICENCE
====================================================== */

app.delete("/licences/:cle", (req, res) => {

  const cle = req.params.cle;
  const data = chargerData();

  data.actives = data.actives.filter(l => l.cle !== cle);

  sauvegarderData(data);

  logServeur("Licence supprimée: " + cle);

  res.json({ succes: true });

});

/* ======================================================
TOGGLE ACTIF
====================================================== */

app.post("/toggle-licence", (req, res) => {

  const data = chargerData();
  const { cle } = req.body;

  const index = data.actives.findIndex(l => l.cle === cle);

  if (index === -1) {
    return res.json({ ok: false });
  }

  data.actives[index].actif = !data.actives[index].actif;

  sauvegarderData(data);

  res.json({
    ok: true,
    actif: data.actives[index].actif
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

  const data = chargerData();
  const licence = data.actives.find(l => l.cle === licenseKey);

  if (!licence) {
    return res.json({ status: "invalid" });
  }

  if (licence.actif === false) {
    return res.json({ status: "disabled" });
  }

  if (licence.dateExpiration) {
    const today = new Date();
    const expiration = new Date(licence.dateExpiration);

    if (!Number.isNaN(expiration.getTime()) && expiration < today) {
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
  const data = chargerData();

  const licence = data.actives.find(l => l.cle === cle);

  if (!licence) {
    return res.json({ autorise: false });
  }

  res.json({
    autorise: licence.actif !== false,
    licence
  });

});

/* ======================================================
GET LICENCE PAR EMAIL
====================================================== */

app.get("/licence/:email", (req, res) => {

  const email = req.params.email;
  const data = chargerData();

  const licence = data.actives.find(l => l.email === email);

  if (!licence) {
    return res.status(404).json({ error: "Licence introuvable" });
  }

  res.json({ cle: licence.cle });

});

/* ======================================================
PORT (RENDER)
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logServeur("SERVEUR LICENCE JLR ACTIF sur port " + PORT);
});
