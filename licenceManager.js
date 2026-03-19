// ===============================
// VPIJLR LICENCE MANAGER (RENDER PRO)
// ===============================

let licences = [];
let serveurURL = "https://licence-server-jlr-0jex.onrender.com";

// ===============================
// KEEP ALIVE RENDER (ANTI SLEEP)
// ===============================
function keepAlive(){

fetch(serveurURL + "/ping?t=" + Date.now())
.catch(()=>{});

}

// ping toutes les 5 minutes
setInterval(keepAlive, 300000);

// ===============================
// API FETCH CENTRALISÉ (ROBUSTE)
// ===============================
async function apiFetch(endpoint, options = {}){

try{

const res = await fetch(serveurURL + endpoint + "?t=" + Date.now(), {
...options,
headers: {
"Content-Type": "application/json",
...(options.headers || {})
}
});

return res;

}catch(e){

log("Erreur réseau: " + e.message);
throw e;

}

}

// ===============================
// LOG ACTIVITÉ
// ===============================
function log(msg){
const box = document.getElementById("journalActivite");
const time = new Date().toLocaleTimeString();
box.innerHTML += `[${time}] ${msg}\n`;
box.scrollTop = box.scrollHeight;
}

// ===============================
// STATUS SERVEUR (ANTI SLEEP RENDER)
// ===============================
async function verifierServeur(){

setStatus("connecting", "Connexion serveur...");

try{

// réveil Render
await apiFetch("/ping");
await new Promise(r => setTimeout(r, 800));

const res = await apiFetch("/ping");

if(res.ok){
setStatus("online", "Serveur connecté");
chargerLicencesServeur();
}else{
throw new Error("Ping invalide");
}

}catch(e){

setStatus("offline", "Serveur hors ligne");
log("Erreur serveur: " + e.message);

}

}

function setStatus(type, texte){

const barre = document.getElementById("barreEtat");
const label = document.getElementById("etatServeurTexte");

barre.className = "status-bar status-" + type;
barre.innerText = texte;
label.innerText = texte;

}

// ===============================
// DATES AUTOMATIQUES
// ===============================
function setDatesAuto(){

const today = new Date();
const activation = today.toISOString().split("T")[0];

document.getElementById("dateActivation").value = activation;

const type = document.getElementById("typeLicence").value;

let expirationDate = new Date(today);

if(type.includes("mensuelle")){
expirationDate.setMonth(expirationDate.getMonth() + 1);
}
else if(type.includes("annuelle")){
expirationDate.setFullYear(expirationDate.getFullYear() + 1);
}
else if(type.includes("achat")){
expirationDate.setFullYear(expirationDate.getFullYear() + 10);
}

const expiration = expirationDate.toISOString().split("T")[0];

document.getElementById("dateExpiration").value = expiration;

}

// ===============================
// GÉNÉRATION CLÉ
// ===============================
function genererCle(){
return "VPI-" + Math.random().toString(36).substring(2,10).toUpperCase();
}

// ===============================
// CRÉER LICENCE
// ===============================
async function genererLicence(){

setDatesAuto();

const logiciel = document.getElementById("logiciel").value;
const client = document.getElementById("client").value;
const email = document.getElementById("emailClient").value;
const type = document.getElementById("typeLicence").value;
const activation = document.getElementById("dateActivation").value;
const expiration = document.getElementById("dateExpiration").value;

if(!client){
alert("Client requis");
return;
}

const cle = genererCle();
document.getElementById("licenceGeneree").value = cle;

const licence = {
logiciel,
client,
email,
type,
activation,
expiration,
cle,
machines: type.includes("_5") ? 5 : 1,
statut: "actif"
};

try{

const res = await apiFetch("/licences",{
method:"POST",
body: JSON.stringify(licence)
});

if(!res.ok){
throw new Error("Erreur API POST");
}

log("Licence créée pour " + client);

chargerLicencesServeur();

}catch(e){

log("Erreur création licence: " + e.message);

}

}

// ===============================
// CHARGER LICENCES
// ===============================
async function chargerLicencesServeur(){

try{

const res = await apiFetch("/licences");

if(!res.ok){
throw new Error("Route /licences invalide");
}

const data = await res.json();

if(!Array.isArray(data)){
throw new Error("Format JSON invalide");
}

licences = data;

afficherLicences();

document.getElementById("compteurLicences").innerText = licences.length;
document.getElementById("derniereSync").innerText = new Date().toLocaleString();

log("Synchronisation OK");

}catch(e){

log("Erreur chargement serveur: " + e.message);

}

}

// ===============================
// AFFICHAGE TABLEAU
// ===============================
function afficherLicences(){

const tbody = document.getElementById("listeClients");
tbody.innerHTML = "";

licences.forEach(l => {

const tr = document.createElement("tr");

tr.innerHTML = `
<td>${l.logiciel}</td>
<td>${l.client}</td>
<td>${l.type}</td>
<td>${l.machines}</td>
<td>${l.expiration}</td>
<td>${l.statut}</td>
<td>${l.cle}</td>
<td>
<button onclick="supprimerLicence('${l.cle}')">Supprimer</button>
</td>
`;

tbody.appendChild(tr);

});

}

// ===============================
// SUPPRESSION
// ===============================
async function supprimerLicence(cle){

if(!confirm("Supprimer cette licence ?")) return;

try{

const res = await apiFetch("/licences/" + cle,{
method:"DELETE"
});

if(!res.ok){
throw new Error("Erreur suppression");
}

log("Licence supprimée");

chargerLicencesServeur();

}catch(e){

log("Erreur suppression: " + e.message);

}

}

// ===============================
// RECHERCHE
// ===============================
function rechercherClient(){

const filtre = document.getElementById("rechercheClient").value.toLowerCase();

const lignes = document.querySelectorAll("#listeClients tr");

lignes.forEach(ligne => {
ligne.style.display = ligne.innerText.toLowerCase().includes(filtre) ? "" : "none";
});

}

// ===============================
// EVENTS
// ===============================
document.getElementById("typeLicence").addEventListener("change", setDatesAuto);

window.addEventListener("load", () => {

setDatesAuto();
verifierServeur();

// ping + refresh intelligent
setInterval(verifierServeur, 10000);

});
