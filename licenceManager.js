
/* ======================================================
MODULE 01
CONFIGURATION SERVEUR
====================================================== */

const API_URL = "https://licence-server-jlr-eui5.onrender.com";

/* ======================================================
MODULE 02
ETAT SERVEUR
====================================================== */

async function verifierServeur() {
  const barre = document.getElementById("barreEtat");
  const texte = document.getElementById("etatServeurTexte");

  barre.className = "status-bar status-connecting";
  texte.textContent = "Connexion...";

  try {
    const res = await fetch(API_URL + "/api");
    const data = await res.json();

    barre.className = "status-bar status-online";
    barre.textContent = "Serveur connecté";
    texte.textContent = "EN LIGNE";

    document.getElementById("compteurLicences").textContent = data.licences;
    document.getElementById("derniereSync").textContent = new Date().toLocaleString();

  } catch (e) {
    barre.className = "status-bar status-offline";
    barre.textContent = "Serveur hors ligne";
    texte.textContent = "OFFLINE";
  }
}

/* ======================================================
MODULE 03
GENERER LICENCE
====================================================== */

function genererCle() {
  return "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function genererLicence() {

  const client = document.getElementById("client").value.trim();
  const email = document.getElementById("emailClient").value.trim();
  const type = document.getElementById("typeLicence").value;
  const logiciel = document.getElementById("logiciel").value;

  if (!client) {
    alert("Nom client requis");
    return;
  }

  const cle = genererCle();

  const licence = {
    logiciel,
    client,
    email,
    type,
    cle,
    dateCreation: new Date().toISOString()
  };

  try {
    await fetch(API_URL + "/licences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(licence)
    });

    document.getElementById("licenceGeneree").value = cle;

    log("Licence créée : " + cle);

    chargerLicencesServeur();
    verifierServeur();

  } catch (e) {
    log("Erreur création licence");
  }
}

/* ======================================================
MODULE 04
CHARGER LICENCES
====================================================== */

async function chargerLicencesServeur() {

  try {
    const res = await fetch(API_URL + "/licences");
    const data = await res.json();

    const tbody = document.getElementById("listeClients");
    tbody.innerHTML = "";

    data.forEach(l => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${l.logiciel || ""}</td>
        <td>${l.client || ""}</td>
        <td>${l.type || ""}</td>
        <td>${l.machines || "-"}</td>
        <td>${l.dateExpiration || "-"}</td>
        <td>ACTIF</td>
        <td>${l.cle}</td>
        <td>
          <button onclick="supprimerLicence('${l.cle}')">Supprimer</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    document.getElementById("compteurLicences").textContent = data.length;
    document.getElementById("derniereSync").textContent = new Date().toLocaleString();

    log("Synchronisation OK");

  } catch (e) {
    log("Erreur chargement licences");
  }
}

/* ======================================================
MODULE 05
SUPPRIMER LICENCE
====================================================== */

async function supprimerLicence(cle) {

  if (!confirm("Supprimer cette licence ?")) return;

  try {
    await fetch(API_URL + "/supprimer-licence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle })
    });

    log("Licence supprimée : " + cle);

    chargerLicencesServeur();
    verifierServeur();

  } catch (e) {
    log("Erreur suppression");
  }
}

/* ======================================================
MODULE 06
RECHERCHE CLIENT
====================================================== */

function rechercherClient() {

  const filtre = document.getElementById("rechercheClient").value.toLowerCase();
  const lignes = document.querySelectorAll("#listeClients tr");

  lignes.forEach(ligne => {
    ligne.style.display = ligne.innerText.toLowerCase().includes(filtre) ? "" : "none";
  });
}

/* ======================================================
MODULE 07
JOURNAL
====================================================== */

function log(message) {
  const box = document.getElementById("journalActivite");
  const time = new Date().toLocaleTimeString();

  box.textContent = `[${time}] ${message}\n` + box.textContent;
}

/* ======================================================
MODULE 08
DATES LICENCE (OPTION)
====================================================== */

function calculerDatesLicence() {

  const type = document.getElementById("typeLicence").value;

  const now = new Date();
  let expiration = null;

  if (type.includes("mensuelle")) {
    expiration = new Date(now.setMonth(now.getMonth() + 1));
  } else if (type.includes("annuelle")) {
    expiration = new Date(now.setFullYear(now.getFullYear() + 1));
  }

  document.getElementById("dateActivation").value = new Date().toISOString().split("T")[0];
  document.getElementById("dateRenouvellement").value = expiration ? expiration.toISOString().split("T")[0] : "A vie";
}

/* ======================================================
MODULE 09
INITIALISATION
====================================================== */

window.onload = () => {
  verifierServeur();
  chargerLicencesServeur();
};
