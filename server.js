const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 01
TEST SERVEUR
====================================================== */

app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    message: "Serveur licence actif"
  });
});

/* ======================================================
MODULE 02
STOCKAGE TEMPORAIRE
====================================================== */

let licences = [];
let demandes = [];

/* ======================================================
MODULE 03
DEMANDE ACTIVATION
====================================================== */

app.post("/demande-activation", (req, res) => {
  const { cle, machine } = req.body;

  if (!cle || !machine) {
    return res.status(400).json({ status: "donnees_manquantes" });
  }

  demandes.push({
    cle,
    machine,
    date: new Date().toISOString()
  });

  res.json({ status: "demande_envoyee" });
});

/* ======================================================
MODULE 04
LISTE DEMANDES
====================================================== */

app.get("/demandes", (req, res) => {
  res.json(demandes);
});

/* ======================================================
MODULE 05
AJOUT LICENCE (UTILISÉ PAR TON LOGICIEL)
====================================================== */

app.post("/ajouter-licence", (req, res) => {
  const licence = req.body;

  licences.push(licence);

  console.log("LICENCE AJOUTÉE :", licence);

  res.json({ status: "ok" });
});

/* ======================================================
MODULE 06
LISTE LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(licences);
});

/* ======================================================
MODULE 07
SUPPRIMER LICENCE
====================================================== */

app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body;

  licences = licences.filter(l => l.cle !== cle);

  res.json({ status: "supprime" });
});

/* ======================================================
MODULE 08
DEMARRAGE
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt");
});
