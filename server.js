/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // ⚠️ requis sur Render

/* ======================================================
MODULE 02
INITIALISATION
====================================================== */

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 03
FICHIER STOCKAGE LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

function chargerLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/* ======================================================
MODULE 04
ROUTE RACINE
====================================================== */

app.get("/", (req, res) => {
  res.send("SERVEUR LICENCE JLR ACTIF");
});

/* ======================================================
MODULE 05
ETAT SERVEUR
====================================================== */

app.get("/api", (req, res) => {

  const licences = chargerLicences();

  res.json({
    status: "OK",
    licences: licences.length,
    date: new Date()
  });

});

/* ======================================================
MODULE 06
LISTER LICENCES
====================================================== */

app.get("/licences", (req, res) => {

  const licences = chargerLicences();

  res.json(licences);

});

/* ======================================================
MODULE 07
AJOUT LICENCE
====================================================== */

app.post("/licences", (req, res) => {

  const licences = chargerLicences();
  const licence = req.body;

  if (!licence || !licence.cle) {
    return res.status(400).json({ erreur: "Licence invalide" });
  }

  licence.actif = true;

  licences.push(licence);

  sauvegarderLicences(licences);

  res.json({ succes: true, licence });

});

/* ======================================================
MODULE 08
SUPPRIMER LICENCE
====================================================== */

app.post("/supprimer-licence", (req, res) => {

  let licences = chargerLicences();
  const { cle } = req.body;

  licences = licences.filter(l => l.cle !== cle);

  sauvegarderLicences(licences);

  res.json({ succes: true });

});

/* ======================================================
MODULE 09
TOGGLE LICENCE
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

  res.json({ ok: true, actif: licences[index].actif });

});

/* ======================================================
MODULE 10
VERIFIER LICENCE
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
    licence: licence
  });

});

/* ======================================================
MODULE 11
SYNC CLIENT → GITHUB CLOUD (SECURISÉ)
====================================================== */

app.post("/sync-client-cloud", async (req, res) => {

  const client = req.body;

  try {

    const url = "https://api.github.com/repos/JLR1959/VPIJLR-logiciel-client/contents/data.json";

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({ erreur: "Token manquant serveur" });
    }

    // ==========================
    // 1. LIRE GITHUB
    // ==========================
    const r = await fetch(url);
    const d = await r.json();

    const contenu = JSON.parse(Buffer.from(d.content, 'base64').toString());

    if (!contenu.clients) contenu.clients = [];

    // ==========================
    // 2. ANTI DOUBLON
    // ==========================
    const existe = contenu.clients.find(c =>
      c.locataire === client.locataire &&
      c.date === client.date
    );

    if (!existe) {
      contenu.clients.push(client);
    }

    // ==========================
    // 3. SAUVEGARDE
    // ==========================
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "sync licence → cloud",
        content: Buffer.from(JSON.stringify(contenu, null, 2)).toString("base64"),
        sha: d.sha
      })
    });

    res.json({ ok: true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: true });
  }

});

/* ======================================================
MODULE 12
DEMARRAGE SERVEUR
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur licence démarré sur port " + PORT);
});
