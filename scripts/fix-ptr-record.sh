#!/bin/bash
# ╔═══════════════════════════════════════════════════════╗
# ║  Fix PTR record pour postal.zhiive.com (Hetzner)     ║
# ╚═══════════════════════════════════════════════════════╝
#
# Usage:
#   HETZNER_API_TOKEN=xxx bash scripts/fix-ptr-record.sh
#   # ou
#   bash scripts/fix-ptr-record.sh <token>

set -euo pipefail

TOKEN="${1:-${HETZNER_API_TOKEN:-}}"
SERVER_ID="${HETZNER_SERVER_ID:-125465224}"
IP="46.225.180.8"
TARGET_PTR="postal.zhiive.com"

if [[ -z "$TOKEN" ]]; then
  echo "❌ Token API Hetzner Cloud requis."
  echo ""
  echo "Usage:"
  echo "  bash scripts/fix-ptr-record.sh <HETZNER_API_TOKEN>"
  echo ""
  echo "Pour obtenir le token:"
  echo "  1. Va sur https://console.hetzner.cloud"
  echo "  2. Projet → Security → API Tokens → Generate (Read & Write)"
  exit 1
fi

echo "🔄 Changement PTR de $IP → $TARGET_PTR ..."

RESPONSE=$(curl -s -X POST \
  "https://api.hetzner.cloud/v1/servers/${SERVER_ID}/actions/change_dns_ptr" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"ip\": \"${IP}\", \"dns_ptr\": \"${TARGET_PTR}\"}")

if echo "$RESPONSE" | grep -q '"status"'; then
  STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -1)
  echo "✅ PTR mis à jour ! $STATUS"
  echo ""
  echo "Vérification (peut prendre quelques minutes pour propager) :"
  echo "  dig +short -x $IP @8.8.8.8"
  
  # Sauver le token dans .env si pas déjà présent
  if grep -q "^HETZNER_API_TOKEN=$" .env 2>/dev/null; then
    sed -i "s|^HETZNER_API_TOKEN=.*|HETZNER_API_TOKEN=${TOKEN}|" .env
    echo "📝 Token sauvé dans .env"
  fi
else
  echo "❌ Erreur :"
  echo "$RESPONSE"
  exit 1
fi

# Aussi changer le PTR IPv6 si existe
echo ""
echo "🔄 Tentative PTR IPv6 aussi..."
IPV6="2a01:4f8:1c18:d184::1"
RESPONSE6=$(curl -s -X POST \
  "https://api.hetzner.cloud/v1/servers/${SERVER_ID}/actions/change_dns_ptr" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"ip\": \"${IPV6}\", \"dns_ptr\": \"${TARGET_PTR}\"}")

if echo "$RESPONSE6" | grep -q '"status"'; then
  echo "✅ PTR IPv6 aussi mis à jour !"
else
  echo "⚠️ PTR IPv6 non modifié (pas grave, IPv6 est désactivé)"
fi

echo ""
echo "🎉 Terminé ! Les emails ne devraient plus atterrir en spam."
