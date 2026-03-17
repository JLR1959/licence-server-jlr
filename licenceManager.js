/* ======================================================
MODULE 01
CONFIG SERVEUR
====================================================== */

const API_URL = "https://licence-server-jlr-eui5.onrender.com";

/* ======================================================
MODULE 02
BASE DES LICENCES
====================================================== */

let licences = [];

/* ======================================================
MODULE 03
OUTILS VISUELS
====================================================== */

function heureActuelle() {
  return new Date().toLocaleTimeString("fr-CA");
}

function ajouterJournal(message) {
  const journal = document.getElementById("journalActivite");
  const ligne = "[" + heureActuelle() + "] " + message;
  journal.textContent = ligne + "\n" + journal.textContent;
}

function setEtatServeur(mode, texte) {
  const barre = document.getElementById("barreEtat");
  const etatTexte = document.getElementById("etatServeurTexte");

  barre.className = "status-bar";

  if (mode === "online") {
    barre.classList.add("status-online");
    etatTexte.textContent = "Connecté";
  }

  if (mode === "offline") {
    barre.classList.add("status-offline");
    etatTexte.textContent = "Hors ligne";
  }

  if (mode === "connecting") {
    barre.classList.add("status-connecting");
    etatTexte.textContent = "Connexion...";
  }

  barre.textContent = texte;
}

function majCompteurLicences() {
  document.getElementById("compteurLicences").textContent = licences.length;
}

function majDerniereSync() {
  document.getElementById("derniereSync").textContent = new Date().toLocaleString("fr-CA");
}

/* ======================================================
MODULE 04
GENERATEUR CODE ACTIVATION
====================================================== */

function genererCodeActivation() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let bloc = 0; bloc < 7; bloc++) {
    let segment = "";

    for (let i = 0; i < 6; i++) {
      segment += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    code += segment;
    if (bloc < 6) code += "-";
  }

  return code;
}

/* ======================================================
MODULE 05
CREATION LICENCE
====================================================== */

async function genererLicence() {

  const client = document.getElementById("client").value.trim();

  if (client === "") {
    alert("Entrer le nom du client");
    ajouterJournal("Création refusée : nom client manquant.");
    return;
  }

  const code = genererCodeActivation();
  document.getElementById("licenceGeneree").value = code;

  const licence = {
    client: client,
    cle: code,
    date: new Date().toISOString()
  };

  try {
    setEtatServeur("connecting", "Envoi licence...");

    const reponse = await fetch(API_URL + "/ajouter-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(licence)
    });

    if (!reponse.ok) {
      throw new Error("Erreur serveur");
    }

    await reponse.json();

    setEtatServeur("online", "Licence enregistrée");
    ajouterJournal("Licence créée pour " + client);

    await chargerLicencesServeur();

  } catch (err) {
    setEtatServeur("offline", "Serveur inaccessible");
    ajouterJournal("Erreur : " + err.message);
  }
}

/* ======================================================
MODULE 06
CHARGER LICENCES
====================================================== */

async function chargerLicencesServeur() {
  try {
    setEtatServeur("connecting", "Connexion serveur...");

    const r = await fetch(API_URL + "/licences");

    if (!r.ok) throw new Error("Erreur HTTP");

    licences = await r.json();

    afficherLicences();
    majCompteurLicences();
    majDerniereSync();

    setEtatServeur("online", "Synchronisé");
    ajouterJournal("Synchronisation OK (" + licences.length + ")");

  } catch (err) {
    setEtatServeur("offline", "Serveur inaccessible");
    ajouterJournal("Erreur sync : " + err.message);
  }
}

/* ======================================================
MODULE 07
AFFICHAGE
====================================================== */

function afficherLicences() {
  const table = document.getElementById("listeClients");
  table.innerHTML = "";

  licences.forEach((licence, index) => {

    const ligne = document.createElement("tr");

    ligne.innerHTML = `
      <td>${licence.client || ""}</td>
      <td style="font-family:monospace;">${licence.cle || ""}</td>
      <td>
        <button onclick="copierLicence(${index})">Copier</button>
        <button onclick="supprimerLicence('${licence.cle}')">Supprimer</button>
      </td>
    `;

    table.appendChild(ligne);
  });
}

/* ======================================================
MODULE 08
COPIER LICENCE
====================================================== */

function copierLicence(index) {
  navigator.clipboard.writeText(licences[index].cle);
  ajouterJournal("Clé copiée");
}

/* ======================================================
MODULE 09
SUPPRIMER LICENCE
====================================================== */

async function supprimerLicence(cle) {

  if (!confirm("Supprimer cette licence ?")) return;

  try {
    setEtatServeur("connecting", "Suppression...");

    const reponse = await fetch(API_URL + "/supprimer-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cle: cle })
    });

    if (!reponse.ok) throw new Error("Erreur suppression");

    ajouterJournal("Licence supprimée");

    await chargerLicencesServeur();

  } catch (err) {
    setEtatServeur("offline", "Erreur suppression");
    ajouterJournal("Erreur : " + err.message);
  }
}

/* ======================================================
MODULE 10
SURVEILLANCE SERVEUR
====================================================== */

async function verifierServeurSilencieux() {
  try {
    await fetch(API_URL + "/ping");
    setEtatServeur("online", "Serveur actif");
  } catch {
    setEtatServeur("offline", "Serveur hors ligne");
  }
}

/* ======================================================
MODULE 11
DEMARRAGE
====================================================== */

window.onload = function () {
  ajouterJournal("Licence Manager démarré.");
  chargerLicencesServeur();
  setInterval(verifierServeurSilencieux, 10000);
};

async function verifierLicence(cle) {

  let machine = localStorage.getItem("machine_id");

  if (!machine) {
    machine = crypto.randomUUID();
    localStorage.setItem("machine_id", machine);
  }

  try {
    const res = await fetch(API_URL + "/valider-licence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cle: cle,
        machine: machine
      })
    });

    const data = await res.json();

    if (data.status === "valide") {
      alert("Licence valide pour " + data.client);
      return true;
    }

    if (data.status === "refusee_machine") {
      alert("Licence déjà utilisée sur un autre appareil");
      return false;
    }

    alert("Licence invalide");
    return false;

  } catch (err) {
    alert("Serveur inaccessible");
    return false;
  }
}
