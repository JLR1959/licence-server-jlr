// ==============================
// MODULE 01 - SETUP
// ==============================
import express from "express";

const app = express();
app.use(express.json());

// ==============================
// MODULE 02 - DATABASE (TEMP)
// ==============================
const users = new Map();

// ==============================
// MODULE 03 - GENERATE LICENCE
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
// MODULE 04 - ROOT (TEST)
// ==============================
app.get("/", (req, res) => {
  res.send("✅ Licence server actif");
});

// ==============================
// MODULE 05 - ACTIVATE USER
// ==============================
app.get("/activate", (req, res) => {

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      error: "email manquant"
    });
  }

  // si déjà activé
  if (users.has(email)) {
    return res.json(users.get(email));
  }

  // créer licence
  const licence = generateLicense();

  const user = {
    email,
    licence,
    status: "VPIJLR 2026 activé",
    active: true,
    createdAt: new Date().toISOString()
  };

  users.set(email, user);

  console.log("NOUVEL UTILISATEUR:", user);

  return res.json(user);
});

// ==============================
// MODULE 06 - CHECK ACCESS SaaS
// ==============================
app.post("/check-access", (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "email requis"
    });
  }

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
// MODULE 07 - DEBUG (OPTIONNEL)
// ==============================
app.get("/debug/users", (req, res) => {
  const allUsers = Array.from(users.values());
  res.json(allUsers);
});

// ==============================
// MODULE 08 - START SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Serveur lancé sur port", PORT);
});
