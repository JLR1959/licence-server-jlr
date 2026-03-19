
// ===============================
// VALIDATION LICENCE (FRONTEND)
// ===============================

const validateButton = document.getElementById('validateLicenseBtn');
const resultElement = document.getElementById('result');

validateButton.addEventListener('click', async () => {

const licenseKey = document.getElementById('licenseKey').value;

if(!licenseKey){
resultElement.innerText = "Entrer une licence";
return;
}

try{

const res = await fetch('https://licence-server-jlr.onrender.com/validate', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({
licenseKey: licenseKey
})
});

if(!res.ok){
throw new Error("Erreur serveur");
}

const data = await res.json();

if(data.status === 'valid'){
resultElement.innerText = "Licence validée avec succès";
}else{
resultElement.innerText = "Licence invalide";
}

}catch(error){

resultElement.innerText = "Erreur connexion serveur";

}

});
