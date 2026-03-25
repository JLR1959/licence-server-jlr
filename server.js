// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";
import { Resend } from "resend";

const app = express();
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// MODULE 02 - DATABASE (TEMP)
// ==============================
const users = new Map();

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
    subject: "Accès activé",
    html: `
      <h2>Accès activé</h2>
      <p>Licence :</p>
      <h3>${licence}</h3>
      <p>Statut : VPIJLR 2026 activé</p>
      <a href="https://ton-app.com">Accéder au logiciel</a>
    `,
  });
}

// ==============================
// MODULE 05 - ACTIVATE USER
// ==============================
app.get("/activate", async (req, res) => {

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ error: "email manquant" });
  }

  // déjà activé
  if (users.has(email)) {
    return res.json(users.get(email));
  }

  const licence = generateLicense();

  const user = {
    email,
    licence,
    active: true,
    status: "VPIJLR 2026 activé"
  };

  users.set(email, user);

  sendMail(email, licence);

  return res.json(user);
});

// ==============================
// MODULE 06 - CHECK ACCESS (SaaS)
// ==============================
app.post("/check-access", (req, res) => {

  const { email } = req.body;

  const user = users.get(email);

  if (!user || !user.active) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  return res.json({
    success: true,
    licence: user.licence,
    status: user.status
  });
});

// ==============================
// MODULE 07 - START
// ==============================
app.listen(3000, () => console.log("OK"));
