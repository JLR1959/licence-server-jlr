
/* ======================================================
SERVEUR LICENCES — STRIPE + INTERAC MANUEL
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ======================================================
MODULE 01 — INIT APP
====================================================== */

const app = express();

/* ======================================================
MODULE 02 — STRIPE (LIVE)
====================================================== */

// 🔴 MET TA CLÉ LIVE ICI
const stripe = require("stripe")("pk_live_51T6yJVQUeVbFaSLwacKILTS53bfdMpkYnBmQ4LBWObKOhr3um2SK4PiS7CGN2xzF5sbKY5JhjbfmFL1UBzkXNgNq00utDK9LyV");

/* ======================================================
MODULE 03 — WEBHOOK STRIPE
====================================================== */

app.post("/stripe-webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {

        console.log("📩 Webhook reçu");

        const sig = req.headers["stripe-signature"];

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                "whsec_1M1Hc1ved6o6leguAM6FSvpQ5i0aD1NP"
            );
        } catch (err) {
            console.error("❌ Erreur webhook :", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log("📌 Event Stripe :", event.type);

        if (event.type === "checkout.session.completed") {

            console.log("💰 Paiement Stripe confirmé");

            const session = event.data.object;

            const cle = genererLicence42();

            const licences = chargerLicences();

            licences.push({
                client: session.customer_details?.name || "Client Stripe",
                email: session.customer_details?.email || "",
                cle: cle,
                date: new Date().toISOString(),
                actif: true,
                source: "stripe"
            });

            sauvegarderLicences(licences);

            console.log("✅ LICENCE STRIPE CRÉÉE :", cle);
        }

        res.json({ received: true });
});

/* ======================================================
MODULE 04 — MIDDLEWARE
====================================================== */

app.use(cors());
app.use(express.json());

/* ======================================================
MODULE 05 — FICHIER
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 06 — UTILITAIRES
====================================================== */

function chargerLicences() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        return [];
    }
}

function sauvegarderLicences(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function genererLicence42() {
    return crypto.randomBytes(21).toString("hex");
}

/* ======================================================
MODULE 07 — INTERAC PAGE CLIENT
====================================================== */

app.get("/interac", (req, res) => {

    res.send(`
    <html>
    <head>
        <title>Paiement Interac</title>
        <style>
            body { font-family: Arial; text-align:center; padding:40px; }
            input { padding:10px; margin:10px; width:250px; }
            button { padding:12px 20px; background:#0074d4; color:white; border:none; }
        </style>
    </head>
    <body>

        <h2>Paiement par Interac</h2>

        <p>Envoyez 49$ à :</p>
        <h3>TONEMAIL@EXEMPLE.COM</h3>

        <p>Message à inclure :</p>
        <b>VOTRE EMAIL</b>

        <hr>

        <h3>J’ai envoyé le paiement</h3>

        <input id="email" placeholder="Votre email"><br>
        <button onclick="valider()">Valider mon paiement</button>

        <p id="resultat"></p>

        <script>
        function valider() {
            fetch('/interac-confirm', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    email: document.getElementById('email').value
                })
            })
            .then(r=>r.json())
            .then(data=>{
                document.getElementById('resultat').innerHTML =
                    "Licence générée : " + data.cle;
            });
        }
        </script>

    </body>
    </html>
    `);
});

/* ======================================================
MODULE 08 — CONFIRMATION INTERAC
====================================================== */

app.post("/interac-confirm", (req, res) => {

    const { email } = req.body;

    const cle = genererLicence42();

    const licences = chargerLicences();

    licences.push({
        client: "Interac",
        email: email,
        cle: cle,
        date: new Date().toISOString(),
        actif: true,
        source: "interac"
    });

    sauvegarderLicences(licences);

    console.log("💸 LICENCE INTERAC CRÉÉE :", cle);

    res.json({ cle });
});

/* ======================================================
MODULE 09 — ROUTES
====================================================== */

app.get("/ping", (req, res) => {
    res.send("OK");
});

app.get("/licences", (req, res) => {
    res.json(chargerLicences());
});

/* ======================================================
MODULE 10 — SERVEUR
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Serveur actif sur port " + PORT);
});
