/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/* ======================================================
MODULE 02
INIT
====================================================== */

const app = express();
app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 03
STOCKAGE LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

function loadLicences() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { disponibles: [], utilisees: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { disponibles: [], utilisees: [] };
  }
}

function saveLicences(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

let dataLicences = loadLicences();

/* ======================================================
MODULE 04
UTIL
====================================================== */

function attribuerLicence() {
  if (dataLicences.disponibles.length === 0) return null;

  const licence = dataLicences.disponibles.shift();
  dataLicences.utilisees.push(licence);
  saveLicences(dataLicences);

  return licence;
}

/* ======================================================
MODULE 05
ROUTES BASE
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur licence PRODUCTION actif");
});

app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    disponibles: dataLicences.disponibles.length,
    utilisees: dataLicences.utilisees.length
  });
});

/* ======================================================
MODULE 06
STRIPE CHECKOUT
====================================================== */

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Licence VPIJLR"
            },
            unit_amount: 5000
          },
          quantity: 1
        }
      ],
      success_url: "https://licence-server-jlr-0jex.onrender.com/success",
      cancel_url: "https://licence-server-jlr-0jex.onrender.com/cancel"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur Stripe");
  }
});

/* ======================================================
MODULE 07
SUCCESS / CANCEL
====================================================== */

app.get("/cancel", (req, res) => {
  res.send("Paiement annulé");
});

let lastLicence = null;

app.get("/success", (req, res) => {
  if (!lastLicence) {
    return res.send("Paiement reçu, traitement en cours...");
  }

  res.send(`
    <h2>Licence activée</h2>
    <p>${lastLicence}</p>
  `);
});

/* ======================================================
MODULE 08
WEBHOOK STRIPE (SÉCURISÉ)
====================================================== */

app.post("/webhook", express.raw({type: "application/json"}), (req, res) => {

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature invalid");
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {

    const licence = attribuerLicence();

    if (!licence) {
      console.error("PLUS DE LICENCES");
    } else {
      lastLicence = licence;
      console.log("Licence attribuée:", licence);
    }
  }

  res.json({ received: true });
});

/* ======================================================
MODULE 09
DEMARRAGE
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur PRODUCTION démarré sur port " + PORT);
});


/* ======================================================
MODULE 10
GENERATION CLE 42 CARACTERES
====================================================== */

function genererCleLicence() {

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function bloc() {
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  return [
    bloc(),
    bloc(),
    bloc(),
    bloc(),
    bloc(),
    bloc(),
    bloc()
  ].join("-");
}

/* ======================================================
MODULE 11
ENREGISTRER LICENCE ACTIVE
====================================================== */

function enregistrerLicence(cle) {

  let data;

  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    data = { actives: [] };
  }

  data.actives.push({
    cle: cle,
    date: new Date().toISOString()
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
