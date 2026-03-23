/* ======================================================
SERVEUR LICENCE JLR — VERSION MINIMALE STABLE
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

/* ======================================================
CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MIDDLEWARES
====================================================== */

app.use(cors());

// JSON normal pour toutes les routes sauf webhook
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    // laisser le webhook gérer le raw body si utilisé
    next();
  } else {
    express.json()(req, res, next);
  }
});

/* ======================================================
UTILS
====================================================== */

function logServeur(msg){
  console.log(new Date().toISOString(), "-", msg);
}

function chargerLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function sauvegarderLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function genererCleLicence(){
  // cle simple; tu peux changer le préfixe si tu veux
  return "LIC-" + Math.random().toString(36).substring(2,10).toUpperCase();
}

/* ======================================================
ROUTES DE BASE
====================================================== */

app.get("/ping", (req, res) => {
  res.send("OK");
});

app.get("/", (req, res) => {
  res.send("SERVEUR LICENCE JLR ACTIF");
});

/* ======================================================
API STATUT
====================================================== */

app.get("/api", (req, res) => {
  const licences = chargerLicences();
  res.json({
    status: "OK",
    total: licences.length,
    date: new Date()
  });
});

/* ======================================================
LISTER LICENCES
====================================================== */

app.get("/licences", (req, res) => {
  res.json(chargerLicences());
});

/* ======================================================
AJOUTER LICENCE MANUELLEMENT
====================================================== */

app.post("/licences", (req, res) => {
  const licences = chargerLicences();
  const licence = req.body;

  if (!licence || !licence.cle) {
    return res.status(400).json({ erreur: "Licence invalide" });
  }

  const existe = licences.find(l => l.cle === licence.cle);
  if (existe) {
    return res.status(400).json({ erreur: "Licence déjà existante" });
  }

  licence.actif = true;
  licences.push(licence);
  sauvegarderLicences(licences);

  logServeur("Licence créée manuellement: " + licence.cle);

  res.json({ succes: true, licence });
});

/* ======================================================
SUPPRIMER LICENCE
====================================================== */

app.delete("/licences/:cle", (req, res) => {
  const cle = req.params.cle;
  let licences = chargerLicences();

  licences = licences.filter(l => l.cle !== cle);
  sauvegarderLicences(licences);

  logServeur("Licence supprimée: " + cle);

  res.json({ succes: true });
});

/* ======================================================
WEBHOOK STRIPE (OPTIONNEL MINIMAL)
====================================================== */

// Si tu utilises Stripe et que tu as STRIPE_* dans l'environnement,
// tu peux garder ce bloc. Sinon tu peux le commenter temporairement.
// L'idée est d'avoir un code stable qui démarre correctement.

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (stripeSecretKey && stripeWebhookSecret) {
  const stripe = require("stripe")(stripeSecretKey);

  app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        stripeWebhookSecret
      );
    } catch (err) {
      console.log("Webhook invalide:", err.message);
      return res.status(400).send();
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const licences = chargerLicences();
      const cle = genererCleLicence();

      const licence = {
        cle: cle,
        email: session.customer_details?.email || "",
        actif: true,
        date: new Date().toISOString()
      };

      licences.push(licence);
      sauvegarderLicences(licences);

      logServeur("LICENCE AUTO STRIPE: " + cle);
    }

    res.json({ received: true });
  });
}

/* ======================================================
PORT
====================================================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logServeur("SERVEUR LICENCE JLR ACTIF sur port " + PORT);
});
