const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    message: "Serveur licence actif"
  });
});

let demandes = [];

app.post("/demande-activation", (req, res) => {
  const { cle, machine } = req.body;

  if (!cle || !machine) {
    return res.status(400).json({ status: "donnees_manquantes" });
  }

  demandes.push({ cle, machine });

  res.json({ status: "demande_envoyee" });
});

app.get("/demandes", (req, res) => {
  res.json(demandes);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt");
});
