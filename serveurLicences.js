/* ======================================================
SERVEUR LICENCE JLR — VERSION COMPLETE FINALE
====================================================== */

const express = require("express")
const fs = require("fs")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
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
  } catch {
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
PING (RENDER)
====================================================== */

app.get("/ping", (req, res) => {
  res.send("OK")
})

/* ======================================================
MODULE 04
ACCUEIL
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur licence VPIJLR actif")
})

/* ======================================================
MODULE 05
LISTE LICENCES (GET)
====================================================== */

app.get("/licences", (req, res) => {
  res.json(lireLicences())
})

/* ======================================================
MODULE 06
AJOUT LICENCE (POST)
====================================================== */

app.post("/licences", (req, res) => {

  const licence = req.body

  if (!licence || !licence.client || !licence.cle) {
    return res.status(400).json({
      erreur: "Licence invalide"
    })
  }

  const licences = lireLicences()

  // 🔴 Anti doublon
  const existe = licences.find(l => l.cle === licence.cle)

  if (existe) {
    return res.status(400).json({
      erreur: "Licence déjà existante"
    })
  }

  licence.actif = true

  licences.push(licence)

  sauverLicences(licences)

  res.json({
    succes: true,
    licence
  })

})

/* ======================================================
MODULE 07
SUPPRESSION LICENCE (DELETE)
====================================================== */

app.delete("/licences/:cle", (req, res) => {

  const cle = req.params.cle

  let licences = lireLicences()

  licences = licences.filter(l => l.cle !== cle)

  sauverLicences(licences)

  res.json({
    succes: true
  })

})

/* ======================================================
MODULE 08
VALIDATION LICENCE (FRONTEND)
====================================================== */

app.post("/validate", (req, res) => {

  const { licenseKey } = req.body

  if (!licenseKey) {
    return res.json({ status: "invalid" })
  }

  const licences = lireLicences()

  const licence = licences.find(l => l.cle === licenseKey)

  if (!licence) {
    return res.json({ status: "invalid" })
  }

  // désactivée
  if (licence.actif === false) {
    return res.json({ status: "disabled" })
  }

  // expiration
  if (licence.expiration) {
    const today = new Date()
    const expiration = new Date(licence.expiration)

    if (expiration < today) {
      return res.json({ status: "expired" })
    }
  }

  res.json({
    status: "valid",
    licence
  })

})

/* ======================================================
MODULE 09
DEMARRAGE
====================================================== */

app.listen(PORT, () => {
  console.log("Serveur licence VPIJLR actif sur port " + PORT)
})
