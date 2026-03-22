/* ======================================================
SERVEUR LICENCE JLR — VERSION STRIPE + LICENCE AUTO
====================================================== */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const stripe = require("stripe")("sk_live_xxx"); // 🔴 MET TA CLÉ STRIPE ICI

const app = express();

/* ======================================================
IMPORTANT STRIPE (NE PAS TOUCHER)
====================================================== */
app.post("/stripe-webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {

        const sig = req.headers["stripe-signature"];

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                "whsec_4k0B8JfTAKSeV8MLZwCnbVP3uEacMrcU"
            );
        } catch (err) {
            console.error("❌ Erreur Stripe :", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        /* ======================================================
        MODULE 01
        GENERATION LICENCE AUTOMATIQUE
        ====================================================== */

        if (event.type === "checkout.session.completed") {

            const session = event.data.object;

            const licences = chargerLicences();

            const cle = genererLicence42();

            const licence = {
                client: session.customer_details?.name || "Client Stripe",
                email: session.customer_details?.email || "",
                cle: cle,
                activation: new Date().toISOString(),
                expiration: null,
                actif: true,
                source: "stripe"
            };

            licences.push(licence);
            sauvegarderLicences(licences);

            console.log("✅ LICENCE CRÉÉE :", cle);
        }

        res.json({ received: true });
});

/* ======================================================
MIDDLEWARE NORMAL (APRES STRIPE)
====================================================== */

app.use(cors());
app.use(express.json());

/* ======================================================
CONFIG
====================================================== */

const DATA_FILE = path.join(__dirname, "licences.json");

/* ======================================================
MODULE 02
UTILS
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

/* ======================================================
MODULE 03
GENERATION LICENCE 42 CARACTERES
====================================================== */

function genererLicence42() {
    return crypto.randomBytes(21).toString("hex");
}

/* ======================================================
MODULE 04
PING
====================================================== */

app.get("/ping", (req, res) => {
    res.send("OK");
});

/* ======================================================
MODULE 05
LISTE LICENCES
====================================================== */

app.get("/licences", (req, res) => {
    res.json(chargerLicences());
});

/* ======================================================
MODULE 06
VALIDATION
====================================================== */

app.post("/validate", (req, res) => {

    const { licenseKey } = req.body;

    const licences = chargerLicences();
    const licence = licences.find(l => l.cle === licenseKey);

    if (!licence) {
        return res.json({ status: "invalid" });
    }

    if (licence.actif === false) {
        return res.json({ status: "disabled" });
    }

    res.json({
        status: "valid",
        licence
    });
});

/* ======================================================
MODULE 07
PORT
====================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Serveur licence + Stripe actif sur port " + PORT);
});
