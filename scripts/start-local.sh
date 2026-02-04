#!/bin/bash

# -----------------------------------------------------------------------------
# SCRIPT DE DÉMARRAGE LOCAL AVEC PROXY CLOUD SQL
# -----------------------------------------------------------------------------
# Ce script automatise :
# 1. L'arrêt des anciennes instances du proxy
# 2. La sélection d'une méthode d'auth stable (service account ou ADC)
# 3. Le démarrage du proxy Cloud SQL (sans --token expirant)
# 4. Le lancement du serveur de développement (npm run dev)
# -----------------------------------------------------------------------------

echo "🚀 Initialisation de l'environnement de développement..."

open_url() {
    local url="$1"
    if [ -z "$url" ]; then
        return 0
    fi

    # Recommandé dans ce container : utiliser $BROWSER si disponible
    if [ -n "$BROWSER" ]; then
        "$BROWSER" "$url" >/dev/null 2>&1 || true
        return 0
    fi

    # Fallbacks (peuvent ne pas fonctionner dans un container sans UI)
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 || true
        return 0
    fi
    if command -v open >/dev/null 2>&1; then
        open "$url" >/dev/null 2>&1 || true
        return 0
    fi

    echo "ℹ️  Impossible d'ouvrir automatiquement le navigateur. Ouvrez manuellement: $url"
}

get_public_url() {
    local port="$1"
    local path="$2"

    if [ -z "$path" ]; then
        path="/"
    fi

    # Codespaces : https://<CODESPACE_NAME>-<port>.<domain>
    if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
        echo "https://${CODESPACE_NAME}-${port}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}${path}"
        return 0
    fi

    echo "http://localhost:${port}${path}"
}

# 1. Arrêt de TOUS les processus existants (proxy, serveur, vite)
echo "🛑 Arrêt des processus existants..."
pkill -f "cloud-sql-proxy" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsx" 2>/dev/null
pkill -f "node.*api-server" 2>/dev/null
pkill -f "prisma studio" 2>/dev/null
sleep 2
echo "✅ Processus arrêtés"

# 2. Auth: préférer un service account (stable) si disponible, sinon ADC.
# IMPORTANT: ne pas utiliser --token (expire ~1h) sinon le proxy peut rester LISTEN mais ne connecte plus Cloud SQL.
echo "🔑 Vérification des credentials Google Cloud..."

# Ajouter gcloud au PATH si installé dans /tmp (Codespaces)
if [ -d "/tmp/google-cloud-sdk/bin" ]; then
    export PATH="/tmp/google-cloud-sdk/bin:$PATH"
fi

CLOUD_SQL_AUTH_MODE=${CLOUD_SQL_AUTH_MODE:-auto} # auto | service-account | gcloud | adc

has_active_gcloud_account() {
    command -v gcloud >/dev/null 2>&1 || return 1
    local active
    active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)
    [ -n "$active" ] || return 1

    # Vérifier que gcloud peut réellement émettre un access token SANS interaction.
    # Sinon, le proxy démarre mais échoue ensuite avec 401 / ACCESS_TOKEN_TYPE_UNSUPPORTED.
    if command -v timeout >/dev/null 2>&1; then
        timeout 3s gcloud auth print-access-token --quiet >/dev/null 2>&1 || return 1
    else
        # Fallback sans timeout: essayer quand même, mais ne jamais bloquer.
        gcloud auth print-access-token --quiet >/dev/null 2>&1 || return 1
    fi

    return 0
}

ensure_gcloud_login() {
    # Vérifie si gcloud a un compte actif, sinon demande à l'utilisateur de se connecter.
    # IMPORTANT: On utilise `gcloud auth login` (pas application-default) car ce dernier
    # peut être bloqué par les politiques de sécurité Google Workspace.
    local active
    active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)
    if [ -z "$active" ]; then
        echo "⚠️  Aucun compte gcloud actif détecté."
        echo ""
        echo "👉 Lance cette commande et suis les instructions :"
        echo "   gcloud auth login --no-launch-browser"
        echo ""
        echo "   1. Copie le lien affiché et ouvre-le dans ton navigateur"
        echo "   2. Connecte-toi avec ton compte Google"
        echo "   3. Copie le code d'autorisation et colle-le ici"
        echo ""
        gcloud auth login --no-launch-browser
        active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)
    fi
    if [ -z "$active" ]; then
        echo "❌ Impossible de s'authentifier à gcloud."
        echo "👉 Réessaie avec: gcloud auth login --no-launch-browser"
        exit 1
    fi
    echo "✅ Connecté en tant que: $active"
}

ensure_adc() {
    # DEPRECATED: ADC peut être bloqué par les politiques Google Workspace.
    # On préfère maintenant `gcloud auth login` + `--gcloud-auth` pour le proxy.
    # Cette fonction reste pour compatibilité si quelqu'un force CLOUD_SQL_AUTH_MODE=adc.
    unset GOOGLE_APPLICATION_CREDENTIALS
    local token
    token=$(gcloud auth application-default print-access-token 2>/dev/null)
    if [ -z "$token" ]; then
        echo "⚠️  Aucun credential ADC détecté."
        echo ""
        echo "⚠️  ATTENTION: 'gcloud auth application-default login' peut être BLOQUÉ"
        echo "   par les politiques de sécurité de ton organisation Google Workspace."
        echo ""
        echo "👉 RECOMMANDÉ: Utilise plutôt le mode gcloud :"
        echo "   CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
        echo ""
        echo "👉 Si tu veux quand même essayer ADC, lance :"
        echo "   gcloud auth application-default login --no-launch-browser"
        echo ""
        read -p "Tenter ADC quand même ? (o/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Oo]$ ]]; then
            gcloud auth application-default login --no-launch-browser
            token=$(gcloud auth application-default print-access-token 2>/dev/null)
        else
            echo "👉 Relance avec: CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
            exit 1
        fi
    fi
    if [ -z "$token" ]; then
        echo "❌ Impossible de récupérer un token ADC."
        echo "👉 Utilise plutôt: CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
        exit 1
    fi
}

SERVICE_ACCOUNT_CREDENTIALS_FILE=""
if [ "$CLOUD_SQL_AUTH_MODE" != "adc" ] && [ "$CLOUD_SQL_AUTH_MODE" != "gcloud" ]; then
    if [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        SERVICE_ACCOUNT_CREDENTIALS_FILE="$GOOGLE_APPLICATION_CREDENTIALS"
    elif [ -f "/tmp/gcloud-key.json" ]; then
        SERVICE_ACCOUNT_CREDENTIALS_FILE="/tmp/gcloud-key.json"
    fi
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "service-account" ]; then
    if [ -z "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
        echo "❌ CLOUD_SQL_AUTH_MODE=service-account mais aucun fichier de credentials n'est disponible."
        exit 1
    fi
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
    if ! has_active_gcloud_account; then
        echo "⚠️  CLOUD_SQL_AUTH_MODE=gcloud mais aucun compte gcloud actif n'est détecté."
        ensure_gcloud_login
    fi
fi

# En mode auto: prioriser gcloud (plus fiable que ADC qui peut être bloqué)
if [ "$CLOUD_SQL_AUTH_MODE" = "auto" ]; then
    if has_active_gcloud_account; then
        CLOUD_SQL_AUTH_MODE="gcloud"
    elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
        CLOUD_SQL_AUTH_MODE="service-account"
    else
        # Pas de SA, pas de gcloud actif → demander de se connecter via gcloud auth login
        echo "⚠️  Aucune authentification détectée."
        ensure_gcloud_login
        CLOUD_SQL_AUTH_MODE="gcloud"
    fi
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
    echo "✅ Mode auth: gcloud (utilisateur)"
    # S'assurer qu'on ne force pas le proxy à utiliser un SA via env var.
    unset GOOGLE_APPLICATION_CREDENTIALS
elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
    echo "✅ Mode auth: service-account ($SERVICE_ACCOUNT_CREDENTIALS_FILE)"
else
    echo "✅ Mode auth: ADC (gcloud)"
    ensure_adc
fi

# 3. Démarrage du proxy
echo "🔌 Démarrage du Cloud SQL Proxy..."
# Utiliser cloud-sql-proxy depuis le PATH (installé via gcloud components ou à la racine)
PROXY_CMD="cloud-sql-proxy"
if [ -f "./cloud-sql-proxy" ]; then
    PROXY_CMD="./cloud-sql-proxy"
fi
# Ne PAS passer --token (expirant). Le proxy utilisera ADC et rafraîchira automatiquement.
PROXY_LOG_FILE="/tmp/cloud-sql-proxy.log"
rm -f "$PROXY_LOG_FILE" >/dev/null 2>&1 || true
PROXY_ARGS=(thiernew:europe-west1:crm-postgres-prod --address 127.0.0.1 --port 5432 --debug-logs)
if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
    PROXY_ARGS+=(--gcloud-auth)
    unset GOOGLE_APPLICATION_CREDENTIALS
elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
    PROXY_ARGS+=(--credentials-file "$SERVICE_ACCOUNT_CREDENTIALS_FILE")
else
    # En mode ADC, s'assurer que le proxy n'est pas forcé à utiliser un SA via env var
    unset GOOGLE_APPLICATION_CREDENTIALS
fi

"$PROXY_CMD" "${PROXY_ARGS[@]}" > "$PROXY_LOG_FILE" 2>&1 &
PROXY_PID=$!

echo "⏳ Attente du démarrage du proxy et du handshake DB (jusqu'à 15s)..."
for i in $(seq 1 15); do
    if ! ps -p $PROXY_PID > /dev/null; then
        echo "❌ Le proxy s'est arrêté pendant le démarrage. Derniers logs:";
        tail -n 80 "$PROXY_LOG_FILE" 2>/dev/null || true
        exit 1
    fi
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
            break
        fi
    fi
    sleep 1
done

if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        echo "❌ Le proxy tourne mais Postgres ne répond pas (IAM/permissions réseau, credentials invalides, instance inaccessible)."
        echo "🧾 Derniers logs du proxy:"
        tail -n 120 "$PROXY_LOG_FILE" 2>/dev/null || true

        if [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ] && [ "$CLOUD_SQL_AUTH_MODE" = "auto" ]; then
            echo ""
            echo "🔁 Fallback: tentative via gcloud (utilisateur)."
            kill "$PROXY_PID" 2>/dev/null || true
            SERVICE_ACCOUNT_CREDENTIALS_FILE=""
            if ! has_active_gcloud_account; then
                ensure_gcloud_login
            fi
            CLOUD_SQL_AUTH_MODE="gcloud"

            rm -f "$PROXY_LOG_FILE" >/dev/null 2>&1 || true
            PROXY_ARGS=(thiernew:europe-west1:crm-postgres-prod --address 127.0.0.1 --port 5432 --debug-logs)
            unset GOOGLE_APPLICATION_CREDENTIALS
            if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
                PROXY_ARGS+=(--gcloud-auth)
            fi
            "$PROXY_CMD" "${PROXY_ARGS[@]}" > "$PROXY_LOG_FILE" 2>&1 &
            PROXY_PID=$!

            echo "⏳ Attente du handshake DB (jusqu'à 15s)..."
            for i in $(seq 1 15); do
                if ! ps -p $PROXY_PID > /dev/null; then
                    echo "❌ Le proxy (ADC) s'est arrêté pendant le démarrage. Derniers logs:";
                    tail -n 80 "$PROXY_LOG_FILE" 2>/dev/null || true
                    exit 1
                fi
                if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
                echo "❌ Toujours pas de réponse Postgres."
                echo "🧾 Derniers logs du proxy:"
                tail -n 160 "$PROXY_LOG_FILE" 2>/dev/null || true
                echo ""
                echo "👉 Astuce: reconnecte-toi avec: gcloud auth login --no-launch-browser"
                echo "👉 Puis relance: bash scripts/start-local.sh"
                exit 1
            fi
        else
            echo ""
            echo "👉 Astuce: reconnecte-toi avec: gcloud auth login --no-launch-browser"
            echo "👉 Puis relance: bash scripts/start-local.sh"
            echo "👉 Vérifie que ton compte a le rôle Cloud SQL Client et que l'instance est accessible."
            exit 1
        fi
    fi
fi

echo "✅ Proxy prêt (Cloud SQL) sur le port 5432"

# 4. Lancement de l'application en MODE DÉVELOPPEMENT (frontend + backend)
export TELNYX_DEBUG_WEBHOOKS=${TELNYX_DEBUG_WEBHOOKS:-1}

echo "🔨 Lancement du serveur de développement (Frontend + Backend)..."
echo ""
npm run dev &

# 5. Prisma Studio (optionnel, activé par défaut)
PRISMA_STUDIO_ENABLED=${PRISMA_STUDIO_ENABLED:-1}
PRISMA_STUDIO_PORT=${PRISMA_STUDIO_PORT:-5555}
if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
    echo ""
    echo "🧩 Lancement de Prisma Studio (port ${PRISMA_STUDIO_PORT})..."
    # --hostname 0.0.0.0 pour être accessible via le forwarding Codespaces
    npx prisma studio --port "${PRISMA_STUDIO_PORT}" --hostname 0.0.0.0 >/dev/null 2>&1 &
fi

sleep 3
echo ""
echo "✅ Environnement de développement prêt!"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:4000"
echo "   💾 DB: Proxy Cloud SQL sur localhost:5432"

# 6. Ouvrir automatiquement les outils (optionnel, activé par défaut)
AUTO_OPEN_TOOLS=${AUTO_OPEN_TOOLS:-1}
if [ "$AUTO_OPEN_TOOLS" = "1" ]; then
    FRONT_URL_1=$(get_public_url 5173 "/connexion?open=1")
    FRONT_URL_2=$(get_public_url 5173 "/connexion?open=2")
    PRISMA_URL=$(get_public_url "${PRISMA_STUDIO_PORT}" "/")

    echo ""
    echo "🧭 Ouverture automatique (si possible) :"
    echo "   - $FRONT_URL_1"
    echo "   - $FRONT_URL_2"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "   - $PRISMA_URL"
    fi

    open_url "$FRONT_URL_1"
    open_url "$FRONT_URL_2"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        # Laisser 1-2s à Prisma Studio pour démarrer avant d'ouvrir l'URL
        sleep 2
        open_url "$PRISMA_URL"
    fi
fi

# Si Codespaces, afficher l'URL tunnelisée
if [ -n "$CODESPACES" ] || [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    echo ""
    echo "🌐 URL Codespaces:"
    echo "   Frontend: https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    echo "   Backend: https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "   Prisma Studio: https://${CODESPACE_NAME}-${PRISMA_STUDIO_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    fi
    echo ""
    echo "⚠️  Rendez les ports 5173 et 4000 PUBLIC dans l'onglet Ports!"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "⚠️  Rendez aussi le port ${PRISMA_STUDIO_PORT} PUBLIC (Prisma Studio)."
    fi
fi
echo ""
echo "📝 Pour modifier le code: éditez puis relancez 'bash scripts/start-local.sh'"
echo "Pour fermer tout: pkill -f 'npm run dev' && pkill -f 'cloud-sql-proxy'"
