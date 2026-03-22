/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

/* ======================================================
MODULE 02
VERIFICATION STRIPE
====================================================== */

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERREUR: STRIPE_SECRET_KEY manquante");
  process.exit(1);
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("ERREUR: STRIPE_WEBHOOK_SECRET manquant");
  process.exit(1);
}

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/* ======================================================
MODULE 03
INIT
====================================================== */

const app = express();
app.use(cors());

/* ⚠️ IMPORTANT : JSON PARTOUT SAUF WEBHOOK */
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

/* ======================================================
MODULE 04
FICHIER LICENCES
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 05
GENERATION CLE 42 CARACTERES
====================================================== */

function genererCleLicence() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function bloc() {
    let r = "";
    for (let i = 0; i < 6; i++) {
      r += chars[Math.floor(Math.random() * chars.length)];
    }
    return r;
  }

  return [
    bloc(), bloc(), bloc(),
    bloc(), bloc(), bloc(),
    bloc()
  ].join("-");
}

/* ======================================================
MODULE 06
ENREGISTRER LICENCE
====================================================== */

function enregistrerLicence(cle) {

  let data;

  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    data = { actives: [] };
  }

  data.actives.push({
    cle,
    date: new Date().toISOString()
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ======================================================
MODULE 07
ROUTES BASE
====================================================== */

app.get("/", (req, res) => {
  res.send("Serveur OK");
});

app.get("/licences", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    res.json(data);
  } catch {
    res.json({ actives: [] });
  }
});

/* ======================================================
MODULE 08
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
            product_data: { name: "Licence VPIJLR" },
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
    console.error("Erreur Stripe :", err);
    res.status(500).send("Erreur Stripe");
  }

});

/* ======================================================
MODULE 09
WEBHOOK STRIPE (PRODUCTION)
====================================================== */

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {

  console.log("WEBHOOK REÇU");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook invalide :", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  /* 🎯 UNIQUEMENT PAIEMENT RÉUSSI */
  if (event.type === "checkout.session.completed") {

    const licence = genererCleLicence();
    enregistrerLicence(licence);

    console.log("Licence enregistrée :", licence);
  }

  res.json({ received: true });
});

/* ======================================================
MODULE 10
DEMARRAGE
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur démarré sur port " + PORT);
});
