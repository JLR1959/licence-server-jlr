const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error("ADMIN_KEY environment variable missing.");
  process.exit(1);
}

const db = new sqlite3.Database('./licences.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS licences (
      machineId TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      plan TEXT,
      expiry TEXT,
      revoked INTEGER DEFAULT 0
    )
  `);
});

app.post('/verify', (req, res) => {
  const { machineId } = req.body;

  if (!machineId) {
    return res.json({ valid: false });
  }

  db.get(
    "SELECT * FROM licences WHERE machineId = ?",
    [machineId],
    (err, row) => {

      if (err || !row) {
        return res.json({ valid: false });
      }

      if (row.revoked === 1) {
        return res.json({ valid: false });
      }

      if (row.type === "subscription") {
        const today = new Date().toISOString().split("T")[0];
        if (today > row.expiry) {
          return res.json({ valid: false });
        }
      }

      return res.json({ valid: true });
    }
  );
});

app.post('/add', (req, res) => {

  const { adminKey, machineId, type, plan, expiry } = req.body;

  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!machineId || !type) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  db.run(
    `INSERT OR REPLACE INTO licences(machineId, type, plan, expiry, revoked)
     VALUES(?, ?, ?, ?, 0)`,
    [machineId, type, plan || null, expiry || null],
    function(err) {
      if (err) {
        return res.json({ success: false });
      }
      return res.json({ success: true });
    }
  );
});

app.post('/revoke', (req, res) => {

  const { adminKey, machineId } = req.body;

  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!machineId) {
    return res.status(400).json({ error: "Missing machineId" });
  }

  db.run(
    `UPDATE licences SET revoked = 1 WHERE machineId = ?`,
    [machineId],
    function(err) {
      if (err) {
        return res.json({ success: false });
      }
      return res.json({ success: true });
    }
  );
});

app.get('/', (req, res) => {
  res.send("Licence Server Running");
});

app.listen(PORT, () => {
  console.log("Licence server running on port " + PORT);
});
