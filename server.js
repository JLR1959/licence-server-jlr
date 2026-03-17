const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

let licences = [];
let demandes = [];

app.post("/demande-activation", (req, res) => {
  const { cle, machine } = req.body;
  demandes.push({ cle, machine });
  res.json({ status: "ok" });
});

app.get("/demandes", (req, res) => {
  res.json(demandes);
});

// === AJOUT IMPORTANT ===
app.post("/ajouter-licence", (req, res) => {
  licences.push(req.body);
  res.json({ status: "ok" });
});

app.get("/licences", (req, res) => {
  res.json(licences);
});

app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body;
  licences = licences.filter(l => l.cle !== cle);
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt");
});
