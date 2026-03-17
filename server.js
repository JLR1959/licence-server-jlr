const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const FILE = "licences.json";

let licences = [];

function chargerLicences() {
  if (fs.existsSync(FILE)) {
    licences = JSON.parse(fs.readFileSync(FILE));
  }
}

function sauvegarderLicences() {
  fs.writeFileSync(FILE, JSON.stringify(licences, null, 2));
}

app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

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

chargerLicences();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt");
});
