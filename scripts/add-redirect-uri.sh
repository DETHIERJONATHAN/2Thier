#!/bin/bash

# ⚠️ ATTENTION : Cette API nécessite des permissions spéciales
# Plus simple de le faire manuellement via https://console.cloud.google.com

PROJECT_ID="thiernew"
CLIENT_ID="864558991714-mopce4eqh12qai0bs4qqkn9ag2je01tj"
NEW_URI="https://${CODESPACE_NAME}-5173.app.github.dev/auth/google/callback"

echo "🔧 Configuration OAuth Client ID"
echo "📋 Projet: $PROJECT_ID"
echo "🆔 Client: $CLIENT_ID"
echo "🔗 Nouvelle URI: $NEW_URI"
echo ""
echo "⚠️  Malheureusement, gcloud ne supporte pas la modification directe des OAuth clients."
echo ""
echo "✅ SOLUTION RAPIDE (30 secondes) :"
echo "1. Ouvrir: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "2. Cliquer sur: $CLIENT_ID"
echo "3. Ajouter dans 'Authorized redirect URIs':"
echo "   $NEW_URI"
echo "4. Cliquer 'SAVE'"
echo ""
echo "📋 L'URI a été copiée dans votre presse-papier (si xclip installé):"
echo "$NEW_URI" | xclip -selection clipboard 2>/dev/null || echo "(xclip non disponible)"
