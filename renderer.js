const axios = require('axios');

// Récupérer le bouton et le champ de texte
const validateButton = document.getElementById('validateLicenseBtn');
const resultElement = document.getElementById('result');

// Écouter le clic sur le bouton
validateButton.addEventListener('click', async () => {
  const licenseKey = document.getElementById('licenseKey').value;

  try {
    // Envoyer la clé de licence au serveur distant
    const response = await axios.post('https://licence-server-jlr.onrender.com/validate', {
      licenseKey: licenseKey
    });

    // Afficher le résultat dans l'interface utilisateur
    if (response.data.status === 'valid') {
      resultElement.innerText = 'Licence validée avec succès';
    } else {
      resultElement.innerText = 'Licence invalide';
    }
  } catch (error) {
    resultElement.innerText = 'Erreur de connexion au serveur';
  }
});
