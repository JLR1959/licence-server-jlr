/* ======================================================
MODULE 01
BASE DES LICENCES
====================================================== */

let licences = []

/* ======================================================
MODULE 02
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
MODULE 03
GENERATEUR CODE ACTIVATION
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

    if (bloc < 6) {
      code += "-"
    }
  }

  return code
}

/* ======================================================
MODULE 04
CALCULER DATES
====================================================== */

function calculerDatesLicence() {
  const type = document.getElementById("typeLicence").value
  const aujourd = new Date()
  let expiration = new Date(aujourd)

  if (type === "mensuelle_1" || type === "mensuelle_5") {
    expiration.setMonth(expiration.getMonth() + 1)
  }

  if (type === "annuelle_1" || type === "annuelle_5") {
    expiration.setFullYear(expiration.getFullYear() + 1)
  }

  if (type === "achat_1" || type === "achat_5") {
    expiration = "illimité"
  }

  document.getElementById("dateActivation").value = aujourd.toISOString().split("T")[0]

  if (expiration !== "illimité") {
    document.getElementById("dateRenouvellement").value = expiration.toISOString().split("T")[0]
  } else {
    document.getElementById("dateRenouvellement").value = "illimité"
  }
}

/* ======================================================
MODULE 05
CREATION LICENCE
====================================================== */

async function genererLicence() {
  const logiciel = document.getElementById("logiciel").value
  const client = document.getElementById("client").value.trim()
  const email = document.getElementById("emailClient").value.trim()
  const type = document.getElementById("typeLicence").value
  const activation = document.getElementById("dateActivation").value
  const expiration = document.getElementById("dateRenouvellement").value

  if (client === "") {
    alert("Entrer le nom du client")
    ajouterJournal("Création refusée : nom client manquant.")
    return
  }

  const code = genererCodeActivation()
  document.getElementById("licenceGeneree").value = code

  let machines = 1

  if (
    type === "mensuelle_5" ||
    type === "annuelle_5" ||
    type === "achat_5"
  ) {
    machines = 5
  }

  const licence = {
    logiciel: logiciel,
    client: client,
    email: email,
    cle: code,
    type: type,
    machines: machines,
    date_activation: activation,
    date_expiration: expiration,
    statut: "actif"
  }

  try {
    setEtatServeur("connecting", "Envoi de la nouvelle licence au serveur...")

    const reponse = await fetch("http://localhost:3000/ajouter-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(licence)
    })

    if (!reponse.ok) {
      throw new Error("Réponse HTTP " + reponse.status)
    }

    const data = await reponse.json()

    setEtatServeur("online", "Serveur connecté - licence enregistrée avec succès.")
    ajouterJournal("Licence créée pour " + client + " (" + type + ").")
    console.log(data)

    await chargerLicencesServeur()

  } catch (err) {
    setEtatServeur("offline", "Serveur inaccessible - licence non enregistrée sur le serveur.")
    ajouterJournal("Erreur création licence : " + err.message)
    console.error(err)
    alert("Le serveur ne répond pas. Vérifie que serveurLicences.js est démarré.")
  }
}

/* ======================================================
MODULE 06
CHARGER LICENCES SERVEUR
====================================================== */

async function chargerLicencesServeur() {
  try {
    setEtatServeur("connecting", "Connexion au serveur en cours...")

    const r = await fetch("http://localhost:3000/licences")

    if (!r.ok) {
      throw new Error("Réponse HTTP " + r.status)
    }

    licences = await r.json()

    afficherLicences()
    majCompteurLicences()
    majDerniereSync()

    setEtatServeur("online", "Serveur connecté - synchronisation réussie.")
    ajouterJournal("Synchronisation réussie. " + licences.length + " licence(s) chargée(s).")

  } catch (err) {
    setEtatServeur("offline", "Impossible de joindre le serveur licence.")
    ajouterJournal("Échec de communication serveur : " + err.message)
    console.error(err)
  }
}

/* ======================================================
MODULE 07
AFFICHAGE LICENCES
====================================================== */

function libelleType(type) {
  if (type === "mensuelle_1") return "Mensuelle 1"
  if (type === "mensuelle_5") return "Mensuelle 5"
  if (type === "annuelle_1") return "Annuelle 1"
  if (type === "annuelle_5") return "Annuelle 5"
  if (type === "achat_1") return "Achat à vie 1"
  if (type === "achat_5") return "Achat à vie 5"
  return type
}

function afficherLicences() {
  const table = document.getElementById("listeClients")
  table.innerHTML = ""

  const aujourd = new Date()

  licences.forEach((licence, index) => {
    let statut = licence.statut || "actif"

    if (licence.date_expiration !== "illimité") {
      const expiration = new Date(licence.date_expiration)
      const diffTemps = expiration - aujourd
      const diffJours = Math.ceil(diffTemps / (1000 * 60 * 60 * 24))

      if (diffJours <= 0) {
        statut = "expirée"
      }

      if (diffJours > 0 && diffJours <= 30) {
        statut = "expire bientôt (" + diffJours + " jours)"
      }
    }

    const ligne = document.createElement("tr")

    ligne.innerHTML = `
      <td>${licence.logiciel || ""}</td>
      <td>${licence.client || ""}</td>
      <td>${libelleType(licence.type || "")}</td>
      <td>${licence.machines || ""}</td>
      <td>${licence.date_expiration || ""}</td>
      <td>${statut}</td>
      <td style="font-family:monospace;">${licence.cle || ""}</td>
      <td>
        <button onclick="copierLicence(${index})">Copier</button>
        <button onclick="supprimerLicence('${licence.cle}')">Supprimer</button>
      </td>
    `

    table.appendChild(ligne)
  })
}

/* ======================================================
MODULE 08
COPIER LICENCE
====================================================== */

function copierLicence(index) {
  navigator.clipboard.writeText(licences[index].cle)
  ajouterJournal("Clé copiée : " + licences[index].client)
}

/* ======================================================
MODULE 09
SUPPRIMER LICENCE
====================================================== */

async function supprimerLicence(cle) {
  const confirmation = confirm("Supprimer cette licence du serveur ?")

  if (!confirmation) {
    ajouterJournal("Suppression annulée.")
    return
  }

  try {
    setEtatServeur("connecting", "Suppression de la licence en cours...")

    const reponse = await fetch("http://localhost:3000/supprimer-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cle: cle })
    })

    if (!reponse.ok) {
      throw new Error("Réponse HTTP " + reponse.status)
    }

    setEtatServeur("online", "Serveur connecté - licence supprimée.")
    ajouterJournal("Licence supprimée : " + cle)

    await chargerLicencesServeur()

  } catch (err) {
    setEtatServeur("offline", "Échec de suppression - serveur inaccessible.")
    ajouterJournal("Erreur suppression : " + err.message)
    console.error(err)
  }
}

/* ======================================================
MODULE 10
RECHERCHE
====================================================== */

function rechercherClient() {
  const filtre = document.getElementById("rechercheClient").value.toLowerCase()
  const lignes = document.querySelectorAll("#listeClients tr")

  lignes.forEach(ligne => {
    const client = ligne.children[1].textContent.toLowerCase()
    ligne.style.display = client.includes(filtre) ? "" : "none"
  })
}

/* ======================================================
MODULE 11
TEST VISUEL PERIODIQUE
====================================================== */

async function verifierServeurSilencieux() {
  try {
    const r = await fetch("http://localhost:3000/licences")
    if (!r.ok) {
      throw new Error("HTTP " + r.status)
    }

    setEtatServeur("online", "Serveur connecté - surveillance active.")
  } catch (err) {
    setEtatServeur("offline", "Serveur hors ligne ou inaccessible.")
  }
}

/* ======================================================
MODULE 12
DEMARRAGE
====================================================== */

window.onload = function () {
  calculerDatesLicence()
  ajouterJournal("Licence Manager démarré.")
  chargerLicencesServeur()
  setInterval(verifierServeurSilencieux, 10000)
}
