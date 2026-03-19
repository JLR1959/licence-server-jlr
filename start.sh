#!/bin/bash

# ======================================================
# MODULE 01 — CONFIG
# ======================================================

APP_DIR="/home/jean-louis/Bureau/VPIJLR-APP"
SERVER_FILE="serveurLicences.js"
URL_LOCAL="http://localhost:3000"

cd "$APP_DIR" || exit

# ======================================================
# MODULE 02 — STOP ANCIEN SERVEUR (ANTI DOUBLON)
# ======================================================

echo "🔄 Vérification serveur existant..."

pkill -f "$SERVER_FILE" 2>/dev/null

sleep 1

# ======================================================
# MODULE 03 — DEMARRAGE SERVEUR
# ======================================================

echo "🚀 Démarrage serveur licence..."

node "$SERVER_FILE" &

SERVER_PID=$!

# ======================================================
# MODULE 04 — ATTENTE SERVEUR (PING)
# ======================================================

echo "⏳ Attente du serveur..."

for i in {1..10}; do
    sleep 1
    if curl -s "$URL_LOCAL/ping" >/dev/null; then
        echo "✅ Serveur prêt"
        break
    fi
done

# ======================================================
# MODULE 05 — OUVERTURE INTERFACE
# ======================================================

echo "🌐 Ouverture interface..."

xdg-open "$APP_DIR/index.html"

# ======================================================
# MODULE 06 — INFO
# ======================================================

echo "🟢 Application lancée"
echo "PID serveur: $SERVER_PID"
