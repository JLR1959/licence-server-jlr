// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";

const app = express();
app.use(express.json());

// ==============================
// MODULE 02 - CORS FIX
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ==============================
// MODULE 03 - DATABASE
// ==============================
const users = new Map();

// ==============================
// MODULE 04 - LICENCE
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
// MODULE 05 - ROOT
// ==============================
app.get("/", (req, res) => {
  res.send("✅ Licence server actif");
});

// ==============================
// MODULE 06 - ACTIVATE
// ==============================
app.get("/activate", (req, res) => {

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      error: "email manquant"
    });
  }

  if (users.has(email)) {
    return res.json(users.get(email));
  }

  const licence = generateLicense();

  const user = {
    email,
    licence,
    status: "VPIJLR 2026 activé",
    active: true,
    createdAt: new Date().toISOString()
  };

  users.set(email, user);

  console.log("USER:", user);

  return res.json(user);
});

// ==============================
// MODULE 07 - CHECK ACCESS
// ==============================
app.post("/check-access", (req, res) => {

  const { email } = req.body;

  const user = users.get(email);

  if (!user || !user.active) {
    return res.status(403).json({
      error: "Accès refusé"
    });
  }

  return res.json({
    success: true,
    licence: user.licence,
    status: user.status
  });
});

// ==============================
// MODULE 08 - START
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Serveur lancé sur port", PORT);
});
