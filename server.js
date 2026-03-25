// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import Stripe from "stripe";
import { Resend } from "resend";

const app = express();
app.use(express.json());

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
      <a href="https://ton-app.com/login">Accéder</a>
    `,
  });
}

// ==============================
// MODULE 05 - CREATE CHECKOUT
// ==============================
app.post("/create-checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",

    line_items: [
      {
        price: "price_xxx", // ← MET TON VRAI PRICE ID
        quantity: 1,
      },
    ],

    success_url:
      "https://jlr1959.github.io/licence-manager-ui/success.html?session_id={CHECKOUT_SESSION_ID}",

    cancel_url:
      "https://jlr1959.github.io/licence-manager-ui/cancel.html",
  });

  res.json({ url: session.url });
});

// ==============================
// MODULE 06 - ACTIVATE
// ==============================
app.get("/activate/:id", async (req, res) => {
  const id = req.params.id;

  if (cache.has(id)) {
    return res.json({ licence: cache.get(id) });
  }

  const session = await stripe.checkout.sessions.retrieve(id);
  const email = session.customer_details?.email;

  const licence = generateLicense();

  cache.set(id, licence);

  sendMail(email, licence);

  res.json({ licence });
});

// ==============================
// MODULE 07 - START
// ==============================
app.listen(3000, () => console.log("OK"));
