// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { Resend } from "resend";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json());

// ==============================
// MODULE 02 - DATABASE (TEMP SIMPLE)
// ==============================
// Remplace plus tard par vraie DB
const licenses = new Map();

// ==============================
// MODULE 03 - GENERATE LICENSE
// ==============================
function generateLicense() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const block = () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  return Array.from({ length: 7 }, block).join("-");
}

// ==============================
// MODULE 04 - CREATE ACCOUNT
// ==============================
function createOrUpdateUser(email, licenseKey) {
  licenses.set(email, {
    license: licenseKey,
    status: "VPIJLR 2026 activé",
    active: true,
  });
}

// ==============================
// MODULE 05 - EMAIL TEMPLATE
// ==============================
function buildEmailHTML(email, licenseKey) {
  return `
    <h2>Votre accès est activé</h2>
    <p><strong>Email :</strong> ${email}</p>
    <p><strong>Licence :</strong> ${licenseKey}</p>
    <p><strong>Statut :</strong> VPIJLR 2026 activé</p>

    <p>Accéder à votre logiciel SaaS :</p>
    <a href="https://ton-app.com/login">https://ton-app.com/login</a>

    <hr/>
    <p>Instructions :</p>
    <ul>
      <li>Connectez-vous avec votre email</li>
      <li>Votre licence est déjà activée</li>
    </ul>
  `;
}

// ==============================
// MODULE 06 - SEND EMAIL
// ==============================
async function sendEmail(to, licenseKey) {
  await resend.emails.send({
    from: "activation@ton-app.com",
    to,
    subject: "Votre accès SaaS activé",
    html: buildEmailHTML(to, licenseKey),
  });
}

// ==============================
// MODULE 07 - STRIPE WEBHOOK
// ==============================
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Erreur signature Stripe:", err.message);
    return res.sendStatus(400);
  }

  // ==============================
  // MODULE 08 - PAYMENT SUCCESS
  // ==============================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details.email;

    // éviter double traitement
    if (licenses.has(email)) {
      console.log("Utilisateur déjà activé:", email);
      return res.sendStatus(200);
    }

    const licenseKey = generateLicense();

    createOrUpdateUser(email, licenseKey);

    console.log("Activation SaaS:", email, licenseKey);

    await sendEmail(email, licenseKey);
  }

  res.sendStatus(200);
});

// ==============================
// MODULE 09 - LOGIN CHECK (API SaaS)
// ==============================
app.post("/api/login", (req, res) => {
  const { email } = req.body;

  const user = licenses.get(email);

  if (!user || !user.active) {
    return res.status(403).json({ error: "Licence invalide" });
  }

  return res.json({
    success: true,
    license: user.license,
    status: user.status,
  });
});

// ==============================
// MODULE 10 - SERVER
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
