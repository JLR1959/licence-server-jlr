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
INIT
====================================================== */

const app = express();
app.use(cors());

app.use(express.json());

/* ======================================================
MODULE 03
FICHIERS
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");
const LOG_FILE = path.join(__dirname, "logs.txt");

/* ======================================================
MODULE 04
LOGS PERSISTANTS
====================================================== */

function addLog(message) {

  const entry = `[${new Date().toLocaleString()}] ${message}`;

  console.log(entry);

  try {
    fs.appendFileSync(LOG_FILE, entry + "\n");
  } catch (e) {}
}

/* ======================================================
MODULE 05
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
MODULE 06
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
MODULE 07
ENREGISTRER LICENCE COMPLETE
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
    logiciel: infos.logiciel || "VPIJLR 2026",
    client: infos.client || "Inconnu",
    email: infos.email || "",
    type: infos.type || "achat_1",
    dateActivation: infos.dateActivation || new Date().toISOString(),
    dateExpiration: infos.dateExpiration || null,
    machines: infos.machines || 1,
    statut: "actif"
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  addLog("Licence créée : " + infos.cle);
}

/* ======================================================
MODULE 08
ROUTES BASE
====================================================== */

app.get("/", (req, res) => {
  addLog("Ping serveur");
  res.send("OK");
});

app.get("/ping", (req, res) => {
  addLog("Ping reçu");
  res.send("pong");
});

app.get("/licences", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    addLog("Lecture licences (" + data.actives.length + ")");
    res.json(data);
  } catch {
    res.json({ actives: [] });
  }
});

/* ======================================================
MODULE 09
CREATION LICENCE MANUELLE (FRONT)
====================================================== */

app.post("/licences", (req, res) => {

  const { client, email, type, dateActivation, dateExpiration } = req.body;

  const cle = genererCleLicence();

  enregistrerLicence({
    cle,
    client,
    email,
    type,
    dateActivation,
    dateExpiration
  });

  res.json({ success: true, cle });

});

/* ======================================================
MODULE 10
LOGS ENDPOINT
====================================================== */

app.get("/logs", (req, res) => {

  try {
    const data = fs.readFileSync(LOG_FILE, "utf8");
    const lignes = data.split("\n").filter(l => l.trim() !== "");
    res.json(lignes.slice(-200));
  } catch {
    res.json([]);
  }

});

/* ======================================================
MODULE 11
ACTIVITE SERVEUR
====================================================== */

addLog("Serveur prêt");

setInterval(() => {
  addLog("Heartbeat OK");
}, 5000);

/* ======================================================
MODULE 12
DEMARRAGE
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  addLog("Serveur démarré sur port " + PORT);
});
