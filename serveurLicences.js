/* ======================================================
MODULE 01
IMPORTS
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

/* ======================================================
MODULE 02
INIT
====================================================== */

const app = express();
app.use(cors());

/* ======================================================
MODULE 03
CONFIG SERVICES (ENV ONLY)
====================================================== */

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ======================================================
MODULE 04
FICHIERS
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 05
INIT DATA
====================================================== */

function initData() {
  try {
    JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ actives: [] }, null, 2));
  }
}

initData();

/* ======================================================
MODULE 06
GENERATION CLE
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
MODULE 07
ENREGISTRER LICENCE
====================================================== */

function enregistrerLicence(infos) {

  let data;

  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    data = { actives: [] };
  }

  data.actives.push({
    cle: infos.cle,
    email: infos.email,
    dateActivation: new Date().toISOString()
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ======================================================
MODULE 08
EMAIL
====================================================== */

async function envoyerEmail(email, cle) {

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Votre licence VPIJLR",
      text: `Votre clé licence : ${cle}`
    });

    console.log("📧 Email envoyé :", email);

  } catch (err) {
    console.error("Erreur email :", err.message);
  }
}

/* ======================================================
MODULE 09
WEBHOOK STRIPE
====================================================== */

app.post("/webhook-stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch {
      return res.sendStatus(400);
    }

    if (event.type === "checkout.session.completed") {

      const session = event.data.object;
      const email = session.customer_details?.email;

      if (!email) return res.json({ received: true });

      const cle = genererCleLicence();

      enregistrerLicence({ cle, email });

      await envoyerEmail(email, cle);

      console.log("Licence OK :", email);
    }

    res.json({ received: true });
});

/* ======================================================
MODULE 10
JSON
====================================================== */

app.use(express.json());

/* ======================================================
MODULE 11
ROUTES
====================================================== */

app.get("/", (req, res) => {
  res.send("SERVER OK");
});

app.get("/licence/:email", (req, res) => {

  const email = req.params.email;

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const licence = data.actives.find(l => l.email === email);

    if (!licence) {
      return res.status(404).json({ error: "Licence introuvable" });
    }

    res.json({ cle: licence.cle });

  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }

});

/* ======================================================
MODULE 12
START
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur prêt :", PORT);
});
