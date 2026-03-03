const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error("ADMIN_KEY manquant.");
  process.exit(1);
}

const db = new sqlite3.Database('./licences.db');

/* ===========================
   RECREATE TABLE (TEMPORAIRE)
   Supprime ancienne structure
=========================== */
db.serialize(() => {

  db.run("DROP TABLE IF EXISTS licences");

  db.run(`
    CREATE TABLE licences (
      licenceKey TEXT PRIMARY KEY,
      machineId TEXT,
      type TEXT NOT NULL,
      plan TEXT,
      expiry TEXT,
      revoked INTEGER DEFAULT 0
    )
  `);
});

function generateKey() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function formatKey(raw) {
  return "VPIJLR-" +
    raw.substring(0, 8) + "-" +
    raw.substring(8, 16) + "-" +
    raw.substring(16, 24);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function isExpired(expiry) {
  return today() > expiry;
}

/* ===========================
   ACTIVER LICENCE (CLIENT)
=========================== */
app.post('/activate', (req, res) => {

  const { licenceKey, machineId } = req.body;

  if (!licenceKey || !machineId) {
    return res.json({ valid: false });
  }

  db.get(
    "SELECT * FROM licences WHERE licenceKey = ?",
    [licenceKey],
    (err, row) => {

      if (err || !row) {
        return res.json({ valid: false });
      }

      if (row.revoked === 1) {
        return res.json({ valid: false });
      }

      if (row.type === "subscription" && isExpired(row.expiry)) {
        return res.json({ valid: false });
      }

      if (!row.machineId) {
        db.run(
          "UPDATE licences SET machineId = ? WHERE licenceKey = ?",
          [machineId, licenceKey]
        );
      } else if (row.machineId !== machineId) {
        return res.json({ valid: false });
      }

      return res.json({
        valid: true,
        type: row.type,
        plan: row.plan,
        expiry: row.expiry
      });
    }
  );
});

/* ===========================
   AJOUT LICENCE (ADMIN)
=========================== */
app.post('/create', (req, res) => {

  const { adminKey, type, plan, expiry } = req.body;

  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const rawKey = generateKey();
  const licenceKey = formatKey(rawKey);

  db.run(
    `INSERT INTO licences(licenceKey, type, plan, expiry, revoked)
     VALUES(?, ?, ?, ?, 0)`,
    [licenceKey, type, plan || "none", expiry || "2099-12-31"],
    function(err) {
      if (err) {
        return res.json({ success: false });
      }
      return res.json({
        success: true,
        licenceKey
      });
    }
  );
});

/* ===========================
   REVOQUER LICENCE
=========================== */
app.post('/revoke', (req, res) => {

  const { adminKey, licenceKey } = req.body;

  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  db.run(
    `UPDATE licences SET revoked = 1 WHERE licenceKey = ?`,
    [licenceKey],
    function(err) {
      if (err) {
        return res.json({ success: false });
      }
      return res.json({ success: true });
    }
  );
});

/* ===========================
   HEALTH CHECK
=========================== */
app.get('/', (req, res) => {
  res.send("Licence Server V2 Running");
});

app.listen(PORT, () => {
  console.log("Licence server V2 running on port " + PORT);
});
