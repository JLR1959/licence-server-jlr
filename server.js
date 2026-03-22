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
INITIALISATION
====================================================== */

const app = express();

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 03
SERVIR FRONTEND
====================================================== */

app.use(express.static(path.join(__dirname, ".")));

/* ======================================================
MODULE 04
FICHIER STOCKAGE LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

function chargerLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { disponibles: [], utilisees: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { disponibles: [], utilisees: [] };
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

let dataLicences = chargerLicences();

/* ======================================================
MODULE 05
ROUTE TEST
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur licence actif");
});

/* ======================================================
MODULE 06
API STATUS
====================================================== */

app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    disponibles: dataLicences.disponibles.length,
    utilisees: dataLicences.utilisees.length
  });
});

/* ======================================================
MODULE 07
LISTER LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(dataLicences);
});

/* ======================================================
MODULE 08
AJOUT LICENCE
====================================================== */

app.post("/licences", (req, res) => {
  const { cle } = req.body;

  if (!cle) {
    return res.status(400).json({ erreur: "Licence invalide" });
  }

  dataLicences.disponibles.push(cle);
  sauvegarderLicences(dataLicences);

  res.json({ succes: true });
});

/* ======================================================
MODULE 09
SUPPRIMER LICENCE
====================================================== */

app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body;

  dataLicences.disponibles = dataLicences.disponibles.filter(l => l !== cle);
  dataLicences.utilisees = dataLicences.utilisees.filter(l => l !== cle);

  sauvegarderLicences(dataLicences);

  res.json({ succes: true });
});

/* ======================================================
MODULE 10
VERIFIER LICENCE
====================================================== */

app.post("/verifier", (req, res) => {
  const { cle } = req.body;

  const licence = dataLicences.utilisees.find(l => l === cle);

  if (!licence) {
    return res.json({ valide: false });
  }

  res.json({ valide: true });
});

/* ======================================================
MODULE 11
ATTRIBUTION LICENCE
====================================================== */

function attribuerLicence() {
  if (dataLicences.disponibles.length === 0) return null;

  const licence = dataLicences.disponibles.shift();
  dataLicences.utilisees.push(licence);
  sauvegarderLicences(dataLicences);

  return licence;
}

/* ======================================================
MODULE 12
DOWNLOAD + LICENCE
====================================================== */

app.get("/download", (req, res) => {

  const type = req.query.type || "mensuelle";
  const clientNom = req.query.nom || "CLIENT";

  const licence = attribuerLicence();

  if (!licence) {
    return res.send("❌ Plus de licences disponibles");
  }

  let expiration = new Date();

  if (type === "mensuelle") {
    expiration.setMonth(expiration.getMonth() + 1);
  }

  if (type === "annuelle") {
    expiration.setFullYear(expiration.getFullYear() + 1);
  }

  if (type === "permanente") {
    expiration = "illimité";
  }

  const licenceClient = {
    client: clientNom,
    typeLicence: type,
    activation: new Date().toISOString().split("T")[0],
    expiration: expiration === "illimité"
      ? "illimité"
      : expiration.toISOString().split("T")[0],
    signature: licence
  };

  res.send(`
    <h2>Merci ${clientNom}</h2>

    <p><b>Licence :</b> ${licence}</p>
    <p>Type : ${type}</p>
    <p>Expiration : ${licenceClient.expiration}</p>

    <br>

    <button onclick='downloadLicence()'>
      📄 Télécharger licence.json
    </button>

    <script>
      function downloadLicence() {
        const data = ${JSON.stringify(licenceClient)};
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "licence.json";
        a.click();
      }
    </script>
  `);

});

/* ======================================================
MODULE 13
DEMARRAGE SERVEUR
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur démarré sur port " + PORT);
});
