#!/bin/bash
# ============================================================
#  SCRIPT D'INSTALLATION AUTOMATIQUE — Postal pour Zhiive
# ============================================================
#
#  Usage : Sur le serveur Hetzner fraîchement créé, en root :
#    curl -sSL https://raw.githubusercontent.com/DETHIERJONATHAN/2Thier/main/scripts/setup-postal.sh | bash
#
#  Ou si tu as copié le fichier :
#    chmod +x setup-postal.sh && ./setup-postal.sh
#
# ============================================================

set -e

DOMAIN="postal.zhiive.com"
MAIL_DOMAIN="zhiive.com"

echo ""
echo "🐝 ═══════════════════════════════════════════════════"
echo "🐝  Installation Postal pour Zhiive"
echo "🐝  Serveur mail self-hosted — @zhiive.com"
echo "🐝 ═══════════════════════════════════════════════════"
echo ""

# ─── Vérification root ───
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté en root (sudo)"
  exit 1
fi

SERVER_IP=$(curl -s ifconfig.me)
echo "📍 IP du serveur détectée : $SERVER_IP"
echo ""

# ─── 1. Mise à jour système ───
echo "📦 [1/7] Mise à jour du système..."
apt update -qq && apt upgrade -y -qq
echo "✅ Système à jour"

# ─── 2. Installer Docker ───
echo "🐋 [2/7] Installation de Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installé"
else
  echo "✅ Docker déjà installé"
fi

# ─── 3. Installer docker-compose ───
echo "🐋 [3/7] Installation de docker-compose..."
apt install -y -qq docker-compose-plugin 2>/dev/null || true
echo "✅ docker-compose prêt"

# ─── 4. Installer Postal ───
echo "📬 [4/7] Installation de Postal..."
if [ ! -d "/opt/postal/install" ]; then
  git clone https://github.com/postalserver/install /opt/postal/install
  ln -sf /opt/postal/install/bin/postal /usr/bin/postal
fi
echo "✅ Postal téléchargé"

# ─── 5. Bootstrap ───
echo "⚙️  [5/7] Configuration de Postal pour $DOMAIN..."
postal bootstrap "$DOMAIN"
echo "✅ Bootstrap terminé"

# ─── 6. Initialiser la DB ───
echo "🗄️  [6/7] Initialisation de la base de données..."
postal initialize
echo "✅ Base de données initialisée"

# ─── 7. Démarrer ───
echo "🚀 [7/7] Démarrage de Postal..."
postal start
echo "✅ Postal démarré"

# ─── Générer un webhook secret ───
WEBHOOK_SECRET=$(openssl rand -hex 32)

echo ""
echo "🐝 ═══════════════════════════════════════════════════"
echo "🐝  INSTALLATION TERMINÉE !"
echo "🐝 ═══════════════════════════════════════════════════"
echo ""
echo "📋 COPIE CES VALEURS et donne-les moi :"
echo ""
echo "   IP du serveur :      $SERVER_IP"
echo "   Webhook secret :     $WEBHOOK_SECRET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔑 Prochaine étape : crée ton compte admin :"
echo "   postal make-user"
echo ""
echo "   (il te demandera : email, prénom, nom, mot de passe)"
echo ""
echo "🌐 Ensuite, va sur https://$DOMAIN"
echo "   → Crée un 'Server' nommé 'zhiive-mail'"
echo "   → Va dans Credentials → API Keys"
echo "   → Copie la clé API et donne-la moi"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 DNS à configurer chez one.com (zhiive.com) :"
echo ""
echo "   A     postal              → $SERVER_IP"
echo "   MX    @                   → postal.zhiive.com (priorité 10)"
echo "   TXT   @                   → v=spf1 ip4:$SERVER_IP ~all"
echo "   TXT   _dmarc              → v=DMARC1; p=quarantine; rua=mailto:dmarc@zhiive.com"
echo "   CNAME psrp._domainkey     → (voir interface Postal → Server → DNS)"
echo ""
echo "🐝 ═══════════════════════════════════════════════════"
