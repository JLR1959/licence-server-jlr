
/* ======================================================
SERVEUR LICENCE JLR — VERSION STABLE RENDER
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
FICHIER LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

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
ROUTE TEST
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
    licences: licences.length,
    date: new Date()
  });
});

/* ======================================================
LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(chargerLicences());
});

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

app.post("/supprimer-licence", (req, res) => {
  let licences = chargerLicences();
  const { cle } = req.body;

  licences = licences.filter(l => l.cle !== cle);
  sauvegarderLicences(licences);

  res.json({ succes: true });
});

app.post("/toggle-licence", (req, res) => {
  let licences = chargerLicences();
  const { cle } = req.body;

  const index = licences.findIndex(l => l.cle === cle);

  if (index === -1) return res.json({ ok: false });

  licences[index].actif = !licences[index].actif;
  sauvegarderLicences(licences);

  res.json({ ok: true, actif: licences[index].actif });
});

/* ======================================================
VERIFICATION LICENCE
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
SYNC CLOUD (CORRIGÉ)
====================================================== */

app.post("/sync-client-cloud", async (req, res) => {

  try {

    const client = req.body;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({ erreur: "Token GitHub manquant" });
    }

    const url = "https://api.github.com/repos/JLR1959/VPIJLR-logiciel-client/contents/data.json";

    // Lire fichier GitHub
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "vpijlr"
      }
    });

    const d = await r.json();

    const contenu = JSON.parse(
      Buffer.from(d.content, "base64").toString()
    );

    if (!contenu.clients) contenu.clients = [];

    const existe = contenu.clients.find(c =>
      c.locataire === client.locataire &&
      c.date === client.date
    );

    if (!existe) {
      contenu.clients.push(client);
    }

    // Sauvegarde GitHub
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "vpijlr"
      },
      body: JSON.stringify({
        message: "sync client cloud",
        content: Buffer.from(JSON.stringify(contenu, null, 2)).toString("base64"),
        sha: d.sha
      })
    });

    res.json({ ok: true });

  } catch (e) {
    console.error("ERREUR CLOUD :", e);
    res.status(500).json({ erreur: true });
  }

});

/* ======================================================
PORT RENDER
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SERVEUR LICENCE JLR ACTIF sur port " + PORT);
});
