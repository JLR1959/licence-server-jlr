const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "licences.json";

/* =========================
UTILS
========================= */

function chargerLicences() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { actives: [] };
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function genererCle() {
  return "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* =========================
ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("SERVEUR LICENCE OK");
});

app.get("/ping", (req, res) => {
  res.send("OK");
});

app.get("/licences", (req, res) => {
  const data = chargerLicences();
  res.json(data);
});

app.post("/licences", (req, res) => {
  const data = chargerLicences();

  const nouvelle = {
    cle: genererCle(),
    client: req.body.client || "",
    email: req.body.email || "",
    date: new Date().toISOString()
  };

  data.actives.push(nouvelle);
  sauvegarderLicences(data);

  console.log("LICENCE CRÉÉE:", nouvelle.cle);

  res.json(nouvelle);
});

/* =========================
START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SERVEUR LICENCE ACTIF sur port", PORT);
});
