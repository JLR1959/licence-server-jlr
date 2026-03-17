/* ======================================================
MODULE 01
CONFIG SERVEUR
====================================================== */

const API_URL = "https://licence-server-jlr-eui5.onrender.com"

/* ======================================================
MODULE 02
BASE DES LICENCES
====================================================== */

let licences = []

/* ======================================================
MODULE 03
OUTILS VISUELS
====================================================== */

function heureActuelle() {
  return new Date().toLocaleTimeString("fr-CA")
}

function ajouterJournal(message) {
  const journal = document.getElementById("journalActivite")
  const ligne = "[" + heureActuelle() + "] " + message
  journal.textContent = ligne + "\n" + journal.textContent
}

function setEtatServeur(mode, texte) {
  const barre = document.getElementById("barreEtat")
  const etatTexte = document.getElementById("etatServeurTexte")

  barre.className = "status-bar"

  if (mode === "online") {
    barre.classList.add("status-online")
    etatTexte.textContent = "Connecté"
  }

  if (mode === "offline") {
    barre.classList.add("status-offline")
    etatTexte.textContent = "Hors ligne"
  }

  if (mode === "connecting") {
    barre.classList.add("status-connecting")
    etatTexte.textContent = "Connexion..."
  }

  barre.textContent = texte
}

function majCompteurLicences() {
  document.getElementById("compteurLicences").textContent = licences.length
}

function majDerniereSync() {
  document.getElementById("derniereSync").textContent = new Date().toLocaleString("fr-CA")
}

/* ======================================================
MODULE 04
GENERATEUR CODE
====================================================== */

function genererCodeActivation() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""

  for (let bloc = 0; bloc < 7; bloc++) {
    let segment = ""

    for (let i = 0; i < 6; i++) {
      segment += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
    }

    code += segment
    if (bloc < 6) code += "-"
  }

  return code
}

/* ======================================================
MODULE 05
DATES
====================================================== */

function calculerDatesLicence() {
  const type = document.getElementById("typeLicence").value
  const aujourd = new Date()
  let expiration = new Date(aujourd)

  if (type.includes("mensuelle")) expiration.setMonth(expiration.getMonth() + 1)
  if (type.includes("annuelle")) expiration.setFullYear(expiration.getFullYear() + 1)
  if (type.includes("achat")) expiration = "illimité"

  document.getElementById("dateActivation").value = aujourd.toISOString().split("T")[0]

  if (expiration !== "illimité") {
    document.getElementById("dateRenouvellement").value = expiration.toISOString().split("T")[0]
  } else {
    document.getElementById("dateRenouvellement").value = "illimité"
  }
}

/* ======================================================
MODULE 06
CREATION LICENCE
====================================================== */

async function genererLicence() {

  const client = document.getElementById("client").value.trim()
  if (!client) {
    alert("Entrer le nom du client")
    return
  }

  const code = genererCodeActivation()
  document.getElementById("licenceGeneree").value = code

  const licence = {
    client: client,
    cle: code,
    date: new Date().toISOString()
  }

  try {
    setEtatServeur("connecting", "Envoi licence...")

    const res = await fetch(API_URL + "/ajouter-licence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(licence)
    })

    const data = await res.json()

    setEtatServeur("online", "Licence enregistrée")
    ajouterJournal("Licence créée : " + client)

    await chargerLicencesServeur()

  } catch (err) {
    setEtatServeur("offline", "Erreur serveur")
    console.error(err)
  }
}

/* ======================================================
MODULE 07
CHARGER LICENCES
====================================================== */

async function chargerLicencesServeur() {
  try {
    setEtatServeur("connecting", "Connexion...")

    const r = await fetch(API_URL + "/licences")
    licences = await r.json()

    afficherLicences()
    majCompteurLicences()
    majDerniereSync()

    setEtatServeur("online", "Synchronisé")

  } catch (err) {
    setEtatServeur("offline", "Serveur inaccessible")
  }
}

/* ======================================================
MODULE 08
AFFICHAGE
====================================================== */

function afficherLicences() {
  const table = document.getElementById("listeClients")
  table.innerHTML = ""

  licences.forEach((licence, index) => {
    const ligne = document.createElement("tr")

    ligne.innerHTML = `
      <td>${licence.client}</td>
      <td>${licence.cle}</td>
      <td>
        <button onclick="copierLicence(${index})">Copier</button>
        <button onclick="supprimerLicence('${licence.cle}')">Supprimer</button>
      </td>
    `

    table.appendChild(ligne)
  })
}

/* ======================================================
MODULE 09
COPIER
====================================================== */

function copierLicence(index) {
  navigator.clipboard.writeText(licences[index].cle)
  ajouterJournal("Clé copiée")
}

/* ======================================================
MODULE 10
SUPPRESSION
====================================================== */

async function supprimerLicence(cle) {
  if (!confirm("Supprimer ?")) return

  try {
    setEtatServeur("connecting", "Suppression...")

    await fetch(API_URL + "/supprimer-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cle })
    })

    ajouterJournal("Licence supprimée")
    await chargerLicencesServeur()

  } catch (err) {
    setEtatServeur("offline", "Erreur suppression")
  }
}

/* ======================================================
MODULE 11
SURVEILLANCE
====================================================== */

async function verifierServeurSilencieux() {
  try {
    await fetch(API_URL + "/ping")
    setEtatServeur("online", "Serveur actif")
  } catch {
    setEtatServeur("offline", "Serveur hors ligne")
  }
}

/* ======================================================
MODULE 12
DEMARRAGE
====================================================== */

window.onload = function () {
  calculerDatesLicence()
  chargerLicencesServeur()
  setInterval(verifierServeurSilencieux, 10000)
}
