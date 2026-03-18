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
GENERER LICENCE + SYNC CLOUD
====================================================== */

function genererCle() {
  return "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function genererLicence() {

  const client = document.getElementById("client").value.trim();
  const email = document.getElementById("emailClient").value.trim();
  const type = document.getElementById("typeLicence").value;
  const logiciel = document.getElementById("logiciel").value;

  const dateActivation = document.getElementById("dateActivation").value;
  const dateExpiration = document.getElementById("dateExpiration").value;

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
    actif: true,
    dateCreation: new Date().toISOString(),
    dateActivation,
    dateExpiration
  };

  try {

    await fetch(API_URL + "/licences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(licence)
    });

    document.getElementById("licenceGeneree").value = cle;

    log("Licence créée : " + cle);

    // ==========================
    // SYNC CLOUD
    // ==========================
    await fetch(API_URL + "/sync-client-cloud", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locataire: client,
        adresse: "Licence Manager",
        date: new Date().toISOString().split("T")[0]
      })
    });

    log("✔ Client envoyé vers cloud");

    chargerLicencesServeur();
    verifierServeur();

  } catch (e) {
    console.error(e);
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

      const etat = verifierExpirationLicence(l);

      // désactivation automatique
      if (etat.statut === "EXPIRÉE" && l.actif !== false) {
        toggleLicence(l.cle);
      }

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${l.logiciel || ""}</td>
        <td>${l.client || ""}</td>
        <td>${l.type || ""}</td>
        <td>${l.machines || "-"}</td>
        <td>
          ${l.dateExpiration || "-"}
          <br>
          <small>${etat.texte}</small>
        </td>
        <td style="color:${etat.couleur}; font-weight:bold;">
          ${etat.statut}
        </td>
        <td>${l.cle}</td>
        <td>
          <button onclick="toggleLicence('${l.cle}')">
            ${l.actif === false ? "Activer" : "Désactiver"}
          </button>

          <button onclick="supprimerLicence('${l.cle}')">
            Supprimer
          </button>
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
TOGGLE LICENCE
====================================================== */

async function toggleLicence(cle){

  try{

    await fetch(API_URL + "/toggle-licence",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ cle })
    });

    log("Licence modifiée : " + cle);

    chargerLicencesServeur();
    verifierServeur();

  } catch(e){

    log("Erreur toggle licence");

  }

}

/* ======================================================
MODULE 07
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
MODULE 08
JOURNAL
====================================================== */

function log(message) {
  const box = document.getElementById("journalActivite");
  const time = new Date().toLocaleTimeString();

  box.textContent = `[${time}] ${message}\n` + box.textContent;
}

/* ======================================================
MODULE 09
CALCUL DATES
====================================================== */

function calculerDatesLicence() {

  const type = document.getElementById("typeLicence").value;
  const champActivation = document.getElementById("dateActivation");
  const champExpiration = document.getElementById("dateExpiration");

  let dateActivation = champActivation.value;

  if (!dateActivation) {
    dateActivation = new Date().toISOString().split("T")[0];
    champActivation.value = dateActivation;
  }

  const base = new Date(dateActivation);
  let expiration = null;

  if (type.includes("mensuelle")) {
    expiration = new Date(base);
    expiration.setMonth(expiration.getMonth() + 1);
  }

  if (type.includes("annuelle")) {
    expiration = new Date(base);
    expiration.setFullYear(expiration.getFullYear() + 1);
  }

  if (type.includes("achat")) {
    champExpiration.value = "A vie";
    return;
  }

  if (expiration) {
    champExpiration.value = expiration.toISOString().split("T")[0];
  }
}

/* ======================================================
MODULE 10
VERIFICATION EXPIRATION
====================================================== */

function verifierExpirationLicence(licence){

  if(!licence.dateExpiration || licence.dateExpiration === "A vie"){
    return {
      statut: "ACTIF",
      couleur: "#027a48",
      texte: "Valide"
    };
  }

  const maintenant = new Date();
  const expiration = new Date(licence.dateExpiration);

  const diff = expiration - maintenant;
  const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

  if(diff <= 0){
    return {
      statut: "EXPIRÉE",
      couleur: "#b42318",
      texte: "Expirée"
    };
  }

  if(jours <= 7){
    return {
      statut: "ALERTE",
      couleur: "#b54708",
      texte: jours + " jours restants"
    };
  }

  return {
    statut: "ACTIF",
    couleur: "#027a48",
    texte: jours + " jours restants"
  };
}

/* ======================================================
MODULE 11
AUTO SYNCHRO
====================================================== */

window.onload = () => {

  verifierServeur();
  chargerLicencesServeur();

  calculerDatesLicence();

  document.getElementById("typeLicence").addEventListener("change", calculerDatesLicence);
  document.getElementById("dateActivation").addEventListener("change", calculerDatesLicence);

  setInterval(() => {
    chargerLicencesServeur();
    verifierServeur();
  }, 5000);

};
