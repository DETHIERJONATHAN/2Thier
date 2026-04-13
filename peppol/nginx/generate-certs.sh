#!/bin/bash
# Génère des certificats TLS auto-signés pour le reverse proxy Odoo.
# En PRODUCTION, remplacer par Let's Encrypt ou certificats de domaine !
#
# Usage: ./peppol/nginx/generate-certs.sh

set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/certs" && pwd)"
mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/server.crt" && -f "$CERT_DIR/server.key" ]]; then
  echo "⚠️  Certificats déjà existants dans $CERT_DIR — supprimez-les pour régénérer."
  exit 0
fi

echo "🔐 Génération de certificats auto-signés pour Odoo Peppol proxy..."

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.crt" \
  -subj "/C=BE/ST=Hainaut/L=Charleroi/O=2Thier SRL/CN=odoo-peppol.zhiive.local" \
  -addext "subjectAltName=DNS:odoo-peppol.zhiive.local,IP:46.225.180.8"

chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

echo "✅ Certificats générés :"
echo "   - $CERT_DIR/server.crt"
echo "   - $CERT_DIR/server.key"
echo ""
echo "⚠️  En production, remplacez par des certificats Let's Encrypt !"
echo "   Ex: certbot certonly --standalone -d peppol.votre-domaine.be"
