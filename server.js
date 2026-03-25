// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import { Resend } from "resend";

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// MODULE 02 - MEMORY
// ==============================
const cache = new Map();

// ==============================
// MODULE 03 - LICENCE
// ==============================
function generateLicense() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const block = () =>
    Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return Array.from({ length: 7 }, block).join("-");
}

// ==============================
// MODULE 04 - EMAIL
// ==============================
async function sendMail(email, licence) {
  await resend.emails.send({
    from: "activation@ton-app.com",
    to: email,
    subject: "Activation SaaS",
    html: `
      <h2>Licence activée</h2>
      <p><b>${licence}</b></p>
      <p>VPIJLR 2026 activé</p>
      <a href="https://ton-app.com/login">Accéder au SaaS</a>
    `,
  });
}

// ==============================
// MODULE 05 - ACTIVATE
// ==============================
app.get("/activate/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // déjà généré
    if (cache.has(id)) {
      return res.json({ licence: cache.get(id) });
    }

    // récupérer Stripe
    const session = await stripe.checkout.sessions.retrieve(id);

    const email = session.customer_details?.email;

    if (!email) throw new Error("email missing");

    // créer licence
    const licence = generateLicense();

    cache.set(id, licence);

    // email (non bloquant)
    sendMail(email, licence);

    return res.json({ licence });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ==============================
// MODULE 06 - START
// ==============================
app.listen(3000, () => console.log("OK"));
