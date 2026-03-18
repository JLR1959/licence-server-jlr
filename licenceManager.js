/* ======================================================
CONFIG SERVEUR
====================================================== */

const API_URL = "https://licence-server-jlr-eui5.onrender.com";

/* ======================================================
ETAT SERVEUR
====================================================== */

async function verifierServeur() {

  const barre = document.getElementById("barreEtat");
  const texte = document.getElementById("etatServeurTexte");

  barre.className = "status-bar status-connecting";
  texte.textContent = "Connexion...";

  try {

    const res = await fetch(API_URL + "/api");

    if (!res.ok) throw new Error("Serveur KO");

    const data = await res.json();

    barre.className = "status-bar status-online";
    barre.textContent = "Serveur connecté";
    texte.textContent = "EN LIGNE";

    document.getElementById("compteurLicences").textContent = data.licences || 0;
    document.getElementById("derniereSync").textContent = new Date().toLocaleString();

  } catch (e) {

    barre.className = "status-bar status-offline";
    barre.textContent = "Serveur hors ligne";
    texte.textContent = "OFFLINE";

    console.error("ERREUR SERVEUR :", e);

  }
}

/* ======================================================
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

    // ==========================
    // CREATION LICENCE
    // ==========================
    const res = await fetch(API_URL + "/licences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(licence)
    });

    if (!res.ok) throw new Error("Erreur création licence");

    document.getElementById("licenceGeneree").value = cle;

    log("Licence créée : " + cle);

    // ==========================
    // SYNC CLOUD (PROTÉGÉ)
    // ==========================
    try {

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

      log("✔ Sync cloud OK");

    } catch (e) {
      log("⚠ Cloud non disponible (ok en démo)");
    }

    chargerLicencesServeur();
    verifierServeur();

  } catch (e) {

    console.error(e);
    log("Erreur création licence");

  }
}

/* ======================================================
CHARGER LICENCES
====================================================== */

async function chargerLicencesServeur() {

  try {

    const res = await fetch(API_URL + "/licences");

    if (!res.ok) throw new Error("Erreur API");

    const data = await res.json();

    const tbody = document.getElementById("listeClients");
    tbody.innerHTML = "";

    data.forEach(l => {

      const etat = verifierExpirationLicence(l);

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

    console.error(e);
    log("Erreur chargement licences");

  }
}

/* ======================================================
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
JOURNAL
====================================================== */

function log(message) {
  const box = document.getElementById("journalActivite");
  const time = new Date().toLocaleTimeString();
  box.textContent = `[${time}] ${message}\n` + box.textContent;
}

/* ======================================================
INIT
====================================================== */

window.onload = () => {

  verifierServeur();
  chargerLicencesServeur();

  setInterval(() => {
    chargerLicencesServeur();
    verifierServeur();
  }, 5000);

};
