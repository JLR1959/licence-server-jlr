const express = require("express")
const fs = require("fs")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const PORT = 3000
const DB = "licences.json"

/* ======================================================
MODULE 01
LIRE LICENCES
====================================================== */

function lireLicences() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, "[]", "utf8")
  }

  const contenu = fs.readFileSync(DB, "utf8")

  try {
    return JSON.parse(contenu)
  } catch (erreur) {
    return []
  }
}

/* ======================================================
MODULE 02
SAUVER LICENCES
====================================================== */

function sauverLicences(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8")
}

/* ======================================================
MODULE 03
PAGE D'ACCUEIL
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur licence VPIJLR actif")
})

/* ======================================================
MODULE 04
LISTE LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  const licences = lireLicences()
  res.json(licences)
})

/* ======================================================
MODULE 05
AJOUT LICENCE
====================================================== */

app.post("/ajouter-licence", (req, res) => {
  const licence = req.body

  if (!licence.client || !licence.cle) {
    return res.status(400).json({
      erreur: "client ou cle manquant"
    })
  }

  const licences = lireLicences()

  licences.push(licence)

  sauverLicences(licences)

  res.json({
    message: "licence enregistrée",
    licence: licence
  })
})

/* ======================================================
MODULE 06
SUPPRIMER LICENCE
====================================================== */

app.post("/supprimer-licence", (req, res) => {
  const { cle } = req.body

  if (!cle) {
    return res.status(400).json({
      erreur: "cle manquante"
    })
  }

  let licences = lireLicences()
  licences = licences.filter(l => l.cle !== cle)

  sauverLicences(licences)

  res.json({
    message: "licence supprimée"
  })
})

/* ======================================================
MODULE 07
DEMARRER SERVEUR
====================================================== */

app.listen(PORT, () => {
  console.log("Serveur licence VPIJLR actif sur port " + PORT)
})
