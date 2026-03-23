/* ======================================================
MODULE 01
CONFIG
====================================================== */

const SERVEUR_URL = "https://licence-server-jlr-0jex.onrender.com";

/* ======================================================
MODULE 02
LOG UI
====================================================== */

function logUI(type, message){

  const box = document.getElementById("journalActivite");
  const time = new Date().toLocaleTimeString();

  let color = "log-info";
  if(type === "ok") color = "log-ok";
  if(type === "error") color = "log-error";
  if(type === "warn") color = "log-warn";

  const line = document.createElement("div");
  line.className = "log-line " + color;
  line.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

/* ======================================================
MODULE 03
DATES AUTOMATIQUES
====================================================== */

function setDates(){

  const type = document.getElementById("typeLicence").value;
  const today = new Date();

  const activation = today.toISOString().split("T")[0];

  let expiration = "";

  if(type.includes("mensuelle")){
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    expiration = d.toISOString().split("T")[0];
  }

  if(type.includes("annuelle")){
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + 1);
    expiration = d.toISOString().split("T")[0];
  }

  if(type.includes("achat")){
    expiration = "";
  }

  document.getElementById("dateActivation").value = activation;
  document.getElementById("dateExpiration").value = expiration;
}

/* ======================================================
MODULE 04
PING SERVEUR
====================================================== */

async function ping(){

  const barre = document.getElementById("barreEtat");
  const texte = document.getElementById("etatServeurTexte");

  try{

    const response = await fetch(SERVEUR_URL, {
      method: "GET",
      cache: "no-store"
    });

    if(!response.ok){
      throw new Error("Réponse non valide");
    }

    barre.className = "status-bar status-online";
    barre.innerText = "Serveur connecté";
    texte.innerText = "En ligne";

    logUI("ok", "Serveur connecté");

  }catch(error){

    barre.className = "status-bar status-offline";
    barre.innerText = "Serveur hors ligne";
    texte.innerText = "Hors ligne";

    logUI("error", "Serveur inaccessible");
  }
}

/* ======================================================
MODULE 05
CHARGER LICENCES
====================================================== */

async function chargerLicencesServeur(){

  try{

    const response = await fetch(SERVEUR_URL + "/licences", {
      method: "GET",
      cache: "no-store"
    });

    if(!response.ok){
      throw new Error("Réponse licences invalide");
    }

    const data = await response.json();
    const actives = Array.isArray(data) ? data : [];

    const tbody = document.getElementById("listeClients");
    tbody.innerHTML = "";

    actives.forEach((licence) => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${licence.client || "-"}</td>
        <td>${licence.type || "-"}</td>
        <td>${licence.dateExpiration || "-"}</td>
        <td>${licence.cle || "-"}</td>
      `;

      tbody.appendChild(tr);
    });

    document.getElementById("compteurLicences").innerText = actives.length;
    document.getElementById("derniereSync").innerText = new Date().toLocaleTimeString();

    logUI("info", "Licences chargées : " + actives.length);

  }catch(error){
    logUI("error", "Erreur chargement licences");
  }
}

/* ======================================================
MODULE 06
CRÉER LICENCE
====================================================== */

async function genererLicence(){

  setDates();

  const client = document.getElementById("client").value.trim();
  const email = document.getElementById("emailClient").value.trim();
  const type = document.getElementById("typeLicence").value;
  const dateActivation = document.getElementById("dateActivation").value;
  const dateExpiration = document.getElementById("dateExpiration").value;

  try{

    const response = await fetch(SERVEUR_URL + "/licences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cle: genererCleTemp(),
        client,
        email,
        type,
        dateActivation,
        dateExpiration
      })
    });

    if(!response.ok){
      throw new Error("Création impossible");
    }

    const data = await response.json();

    document.getElementById("licenceGeneree").value = data.licence?.cle || "";

    logUI("ok", "Licence créée");

    chargerLicencesServeur();

  }catch(error){
    logUI("error", "Erreur création licence");
  }
}

/* Petite fonction temporaire pour générer une clé si le serveur n'en génère pas */
function genererCleTemp(){
  return "LIC-" + Math.random().toString(36).substring(2,10).toUpperCase();
}

/* ======================================================
MODULE 07
ENVOI EMAIL
====================================================== */

function envoyerEmail(){

  const client = document.getElementById("client").value.trim() || "Client";
  const email = document.getElementById("emailClient").value.trim();
  const cle = document.getElementById("licenceGeneree").value.trim();
  const type = document.getElementById("typeLicence").value;
  const expiration = document.getElementById("dateExpiration").value || "Aucune";

  if(!email){
    alert("Email requis");
    return;
  }

  if(!cle){
    alert("Créez une licence d'abord");
    return;
  }

  const sujet = encodeURIComponent("Votre licence VPIJLR 2026");

  const message = encodeURIComponent(
`Bonjour ${client},

Voici votre licence :

🔑 ${cle}
📦 ${type}
📅 Expiration : ${expiration}

Merci de votre confiance.

Jean-Louis Raymond
VPIJLR 2026`
  );

  window.location.href = `mailto:${email}?subject=${sujet}&body=${message}`;
}

/* ======================================================
MODULE 08
FILTRE
====================================================== */

function filtrer(){

  const valeur = document.getElementById("rechercheClient").value.toLowerCase();
  const lignes = document.querySelectorAll("#tableLicences tbody tr");

  lignes.forEach((ligne) => {
    ligne.style.display = ligne.innerText.toLowerCase().includes(valeur) ? "" : "none";
  });
}

/* ======================================================
MODULE 09
EXPORT PDF
====================================================== */

function exportPDF(){

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  document.querySelectorAll("#tableLicences tbody tr").forEach((ligne) => {

    if(ligne.style.display === "none"){
      return;
    }

    doc.text(ligne.innerText.replace(/\s+/g, " ").trim(), 10, y);
    y += 10;
  });

  doc.save("licences.pdf");

  logUI("info", "Export PDF");
}

/* ======================================================
MODULE 10
INITIALISATION
====================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const typeLicence = document.getElementById("typeLicence");

  if(typeLicence){
    typeLicence.addEventListener("change", setDates);
  }

  setDates();
  ping();
  chargerLicencesServeur();

  setInterval(() => {
    ping();
    chargerLicencesServeur();
  }, 4000);
});

/* ======================================================
MODULE LIVE LOGS — CLIENT
====================================================== */

const journal = document.getElementById("journalActivite");

function ajouterLog(log){

    const ligne = document.createElement("div");

    let couleur = "log-info";
    if(log.type==="ok") couleur = "log-ok";
    if(log.type==="error") couleur = "log-error";

    ligne.innerHTML = `
        <span class="log-time">[${log.time}]</span>
        <span class="${couleur}">${log.message}</span>
    `;

    journal.appendChild(ligne);
    journal.scrollTop = journal.scrollHeight;
}

function connecterLogs(){

    const source = new EventSource("https://licence-server-jlr-0jex.onrender.com/logs");

    source.onmessage = (event)=>{
        const log = JSON.parse(event.data);
        ajouterLog(log);
    };

    source.onerror = ()=>{
        ajouterLog({
            time:new Date().toLocaleTimeString(),
            type:"error",
            message:"Connexion LIVE perdue..."
        });

        setTimeout(connecterLogs,3000);
    };
}

connecterLogs();
