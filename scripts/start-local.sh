#!/bin/bash

# -----------------------------------------------------------------------------
# SCRIPT DE DEMARRAGE LOCAL AVEC PROXY CLOUD SQL
# -----------------------------------------------------------------------------
# Ce script automatise :
# 1. L'arret des anciennes instances du proxy
# 2. La selection d'une methode d'auth stable (service account ou ADC)
# 3. Le demarrage du proxy Cloud SQL sur localhost:5432
# 4. Le lancement du serveur de developpement (npm run dev)
# -----------------------------------------------------------------------------

INSTANCE_CONNECTION_NAME="thiernew:europe-west1:crm-postgres-prod"
PROXY_PORT=5432
PROXY_PID=""
PROXY_LOG_FILE="/tmp/cloud-sql-proxy.log"

echo "Initialisation de l'environnement de developpement..."

open_url() {
    local url="$1"
    if [ -z "$url" ]; then
        return 0
    fi

    if [ -n "${BROWSER:-}" ]; then
        "$BROWSER" "$url" >/dev/null 2>&1 || true
        return 0
    fi

    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 || true
        return 0
    fi

    if command -v open >/dev/null 2>&1; then
        open "$url" >/dev/null 2>&1 || true
        return 0
    fi

    echo "Impossible d'ouvrir automatiquement le navigateur. Ouvre manuellement: $url"
}

get_public_url() {
    local port="$1"
    local path="$2"

    if [ -z "$path" ]; then
        path="/"
    fi

    if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
        echo "https://${CODESPACE_NAME}-${port}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}${path}"
        return 0
    fi

    echo "http://localhost:${port}${path}"
}

WINDOWS_POWERSHELL=""
if command -v powershell.exe >/dev/null 2>&1; then
    WINDOWS_POWERSHELL="powershell.exe"
elif command -v pwsh.exe >/dev/null 2>&1; then
    WINDOWS_POWERSHELL="pwsh.exe"
elif command -v pwsh >/dev/null 2>&1; then
    WINDOWS_POWERSHELL="pwsh"
fi

run_windows_powershell_capture() {
    if [ -z "$WINDOWS_POWERSHELL" ]; then
        return 1
    fi

    "$WINDOWS_POWERSHELL" -NoProfile -NonInteractive -Command "$1"
}

run_windows_powershell() {
    run_windows_powershell_capture "$1" >/dev/null 2>&1
}

kill_port_windows() {
    local port="$1"

    if [ -z "$WINDOWS_POWERSHELL" ]; then
        return 1
    fi

    run_windows_powershell "
        \$pids = @(Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Where-Object { \$_.State -eq 'Listen' } |
            Select-Object -ExpandProperty OwningProcess -Unique);
        foreach (\$pid in \$pids) {
            Stop-Process -Id \$pid -Force -ErrorAction SilentlyContinue
        }
        exit 0
    "
}

stop_windows_cloud_sql_proxy() {
    if [ -z "$WINDOWS_POWERSHELL" ]; then
        return 0
    fi

    run_windows_powershell "
        \$targets = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object {
                \$_.Name -like 'cloud-sql-proxy*' -or
                (\$_.CommandLine -match 'cloud-sql-proxy')
            };
        foreach (\$proc in \$targets) {
            Stop-Process -Id \$proc.ProcessId -Force -ErrorAction SilentlyContinue
        }
        exit 0
    " || true
}

kill_port() {
    local port="$1"

    kill_port_windows "$port" || true

    if command -v fuser >/dev/null 2>&1; then
        fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    fi

    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill $pids >/dev/null 2>&1 || true
        fi
    fi
}

is_port_in_use() {
    local port="$1"

    if [ -n "$WINDOWS_POWERSHELL" ]; then
        if run_windows_powershell "\$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { \$_.State -eq 'Listen' }; if (\$connections) { exit 0 } else { exit 1 }"; then
            return 0
        fi
    fi

    if command -v ss >/dev/null 2>&1; then
        ss -ltn "( sport = :$port )" 2>/dev/null | tail -n +2 | grep -q .
        return $?
    fi

    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
        return $?
    fi

    return 1
}

print_port_usage() {
    local port="$1"

    if [ -n "$WINDOWS_POWERSHELL" ]; then
        run_windows_powershell_capture "
            \$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                Where-Object { \$_.State -eq 'Listen' };
            if (-not \$connections) { exit 0 }
            'Connexions:'
            \$connections | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize
            'Processus:'
            foreach (\$pid in (\$connections | Select-Object -ExpandProperty OwningProcess -Unique)) {
                Get-Process -Id \$pid -ErrorAction SilentlyContinue |
                    Select-Object Id, ProcessName, Path |
                    Format-Table -AutoSize
            }
        " | tr -d '\r'
        return 0
    fi

    if command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
        return 0
    fi

    if command -v ss >/dev/null 2>&1; then
        ss -ltnp "( sport = :$port )" 2>/dev/null || true
    fi
}

ensure_port_free() {
    local port="$1"
    local retries="${2:-5}"
    local attempt

    for attempt in $(seq 1 "$retries"); do
        if ! is_port_in_use "$port"; then
            return 0
        fi

        kill_port "$port"
        stop_windows_cloud_sql_proxy
        sleep 1
    done

    if ! is_port_in_use "$port"; then
        return 0
    fi

    echo "Le port ${port} est toujours occupe apres plusieurs tentatives."
    echo "Processus encore presents sur ${port}:"
    print_port_usage "$port"
    return 1
}

stop_dev_processes() {
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
    pkill -f "node.*api-server" 2>/dev/null || true
    pkill -f "prisma studio" 2>/dev/null || true

    kill_port 4000
    kill_port 5173
    kill_port 5555
}

stop_proxy_processes() {
    if [ -n "$PROXY_PID" ]; then
        kill "$PROXY_PID" >/dev/null 2>&1 || true
    fi

    pkill -f "cloud-sql-proxy" 2>/dev/null || true
    stop_windows_cloud_sql_proxy
    kill_port "$PROXY_PORT"
}

stop_existing_processes() {
    stop_dev_processes
    stop_proxy_processes
}

cleanup() {
    echo ""
    echo "Arret..."
    stop_proxy_processes
    stop_dev_processes
    exit 0
}

trap cleanup INT TERM

has_active_gcloud_account() {
    command -v gcloud >/dev/null 2>&1 || return 1

    local active
    active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)
    [ -n "$active" ] || return 1

    if command -v timeout >/dev/null 2>&1; then
        timeout 3s gcloud auth print-access-token --quiet >/dev/null 2>&1 || return 1
    else
        gcloud auth print-access-token --quiet >/dev/null 2>&1 || return 1
    fi

    return 0
}

ensure_gcloud_login() {
    local active
    active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)

    if [ -z "$active" ]; then
        echo "Aucun compte gcloud actif detecte."
        echo ""
        echo "Lance cette commande et suis les instructions :"
        echo "  gcloud auth login --no-launch-browser"
        echo ""
        echo "1. Copie le lien affiche et ouvre-le dans ton navigateur"
        echo "2. Connecte-toi avec ton compte Google"
        echo "3. Copie le code d'autorisation et colle-le ici"
        echo ""
        gcloud auth login --no-launch-browser
        active=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1)
    fi

    if [ -z "$active" ]; then
        echo "Impossible de s'authentifier a gcloud."
        echo "Reessaie avec: gcloud auth login --no-launch-browser"
        exit 1
    fi

    echo "Connecte en tant que: $active"
}

ensure_adc() {
    unset GOOGLE_APPLICATION_CREDENTIALS

    local token
    token=$(gcloud auth application-default print-access-token 2>/dev/null || true)

    if [ -z "$token" ]; then
        echo "Aucun credential ADC detecte."
        echo ""
        echo "Attention: 'gcloud auth application-default login' peut etre bloque"
        echo "par les politiques de securite de ton organisation Google Workspace."
        echo ""
        echo "Recommande: utilise plutot le mode gcloud :"
        echo "  CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
        echo ""
        echo "Si tu veux quand meme essayer ADC, lance :"
        echo "  gcloud auth application-default login --no-launch-browser"
        echo ""
        read -p "Tenter ADC quand meme ? (o/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Oo]$ ]]; then
            gcloud auth application-default login --no-launch-browser
            token=$(gcloud auth application-default print-access-token 2>/dev/null || true)
        else
            echo "Relance avec: CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
            exit 1
        fi
    fi

    if [ -z "$token" ]; then
        echo "Impossible de recuperer un token ADC."
        echo "Utilise plutot: CLOUD_SQL_AUTH_MODE=gcloud bash scripts/start-local.sh"
        exit 1
    fi
}

echo "Arret des processus existants..."
stop_existing_processes
sleep 2
ensure_port_free "$PROXY_PORT" 5 || exit 1
echo "Processus arretes"

echo "Verification des credentials Google Cloud..."

if [ -d "/tmp/google-cloud-sdk/bin" ]; then
    export PATH="/tmp/google-cloud-sdk/bin:$PATH"
fi

REQUESTED_CLOUD_SQL_AUTH_MODE=${CLOUD_SQL_AUTH_MODE:-auto}
CLOUD_SQL_AUTH_MODE=${REQUESTED_CLOUD_SQL_AUTH_MODE}

SERVICE_ACCOUNT_CREDENTIALS_FILE=""
if [ "$CLOUD_SQL_AUTH_MODE" != "adc" ] && [ "$CLOUD_SQL_AUTH_MODE" != "gcloud" ]; then
    if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        SERVICE_ACCOUNT_CREDENTIALS_FILE="$GOOGLE_APPLICATION_CREDENTIALS"
    elif [ -f "/tmp/gcloud-key.json" ]; then
        SERVICE_ACCOUNT_CREDENTIALS_FILE="/tmp/gcloud-key.json"
    fi
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "service-account" ] && [ -z "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
    echo "CLOUD_SQL_AUTH_MODE=service-account mais aucun fichier de credentials n'est disponible."
    exit 1
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ] && ! has_active_gcloud_account; then
    echo "CLOUD_SQL_AUTH_MODE=gcloud mais aucun compte gcloud actif n'est detecte."
    ensure_gcloud_login
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "auto" ]; then
    if has_active_gcloud_account; then
        CLOUD_SQL_AUTH_MODE="gcloud"
    elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
        CLOUD_SQL_AUTH_MODE="service-account"
    else
        echo "Aucune authentification detectee."
        ensure_gcloud_login
        CLOUD_SQL_AUTH_MODE="gcloud"
    fi
fi

if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
    echo "Mode auth: gcloud (utilisateur)"
    unset GOOGLE_APPLICATION_CREDENTIALS
elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
    echo "Mode auth: service-account ($SERVICE_ACCOUNT_CREDENTIALS_FILE)"
else
    echo "Mode auth: ADC (gcloud)"
    ensure_adc
fi

echo "Demarrage du Cloud SQL Proxy..."
PROXY_CMD=""
if [ -f "./cloud-sql-proxy" ]; then
    PROXY_CMD="./cloud-sql-proxy"
elif [ -f "/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy.exe" ]; then
    PROXY_CMD="/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy.exe"
elif [ -f "/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy" ]; then
    PROXY_CMD="/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy"
elif [ -f "/mnt/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy.exe" ]; then
    PROXY_CMD="/mnt/c/Users/dethi/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy.exe"
else
    PROXY_CMD="$(command -v cloud-sql-proxy 2>/dev/null || true)"
fi

if [ -z "$PROXY_CMD" ]; then
    echo "cloud-sql-proxy introuvable. Installe-le via: gcloud components install cloud-sql-proxy"
    exit 1
fi

echo "cloud-sql-proxy trouve: $PROXY_CMD"
rm -f "$PROXY_LOG_FILE" >/dev/null 2>&1 || true
ensure_port_free "$PROXY_PORT" 3 || exit 1

PROXY_ARGS=("$INSTANCE_CONNECTION_NAME" --address 127.0.0.1 --port "$PROXY_PORT" --debug-logs)
if [ "$CLOUD_SQL_AUTH_MODE" = "gcloud" ]; then
    PROXY_ARGS+=(--gcloud-auth)
    unset GOOGLE_APPLICATION_CREDENTIALS
elif [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ]; then
    PROXY_ARGS+=(--credentials-file "$SERVICE_ACCOUNT_CREDENTIALS_FILE")
else
    unset GOOGLE_APPLICATION_CREDENTIALS
fi

"$PROXY_CMD" "${PROXY_ARGS[@]}" > "$PROXY_LOG_FILE" 2>&1 &
PROXY_PID=$!

echo "Attente du demarrage du proxy et du handshake DB (jusqu'a 15s)..."
for i in $(seq 1 15); do
    if ! ps -p "$PROXY_PID" >/dev/null 2>&1; then
        echo "Le proxy s'est arrete pendant le demarrage. Derniers logs:"
        tail -n 80 "$PROXY_LOG_FILE" 2>/dev/null || true
        exit 1
    fi

    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h 127.0.0.1 -p "$PROXY_PORT" >/dev/null 2>&1; then
            break
        fi
    fi

    sleep 1
done

if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h 127.0.0.1 -p "$PROXY_PORT" >/dev/null 2>&1; then
        echo "Le proxy tourne mais Postgres ne repond pas."
        echo "Derniers logs du proxy:"
        tail -n 120 "$PROXY_LOG_FILE" 2>/dev/null || true

        if [ -n "$SERVICE_ACCOUNT_CREDENTIALS_FILE" ] && [ "$REQUESTED_CLOUD_SQL_AUTH_MODE" = "auto" ]; then
            echo ""
            echo "Fallback: tentative via gcloud (utilisateur)."
            stop_proxy_processes
            ensure_port_free "$PROXY_PORT" 3 || exit 1
            SERVICE_ACCOUNT_CREDENTIALS_FILE=""

            if ! has_active_gcloud_account; then
                ensure_gcloud_login
            fi

            CLOUD_SQL_AUTH_MODE="gcloud"
            PROXY_ARGS=("$INSTANCE_CONNECTION_NAME" --address 127.0.0.1 --port "$PROXY_PORT" --debug-logs --gcloud-auth)
            "$PROXY_CMD" "${PROXY_ARGS[@]}" > "$PROXY_LOG_FILE" 2>&1 &
            PROXY_PID=$!

            echo "Attente du handshake DB (jusqu'a 15s)..."
            for i in $(seq 1 15); do
                if ! ps -p "$PROXY_PID" >/dev/null 2>&1; then
                    echo "Le proxy s'est arrete pendant le fallback gcloud. Derniers logs:"
                    tail -n 80 "$PROXY_LOG_FILE" 2>/dev/null || true
                    exit 1
                fi
                if pg_isready -h 127.0.0.1 -p "$PROXY_PORT" >/dev/null 2>&1; then
                    break
                fi
                sleep 1
            done

            if ! pg_isready -h 127.0.0.1 -p "$PROXY_PORT" >/dev/null 2>&1; then
                echo "Toujours pas de reponse Postgres."
                echo "Derniers logs du proxy:"
                tail -n 160 "$PROXY_LOG_FILE" 2>/dev/null || true
                echo ""
                echo "Astuce: reconnecte-toi avec: gcloud auth login --no-launch-browser"
                echo "Puis relance: bash scripts/start-local.sh"
                exit 1
            fi
        else
            echo ""
            echo "Astuce: reconnecte-toi avec: gcloud auth login --no-launch-browser"
            echo "Puis relance: bash scripts/start-local.sh"
            echo "Verifie que ton compte a le role Cloud SQL Client et que l'instance est accessible."
            exit 1
        fi
    fi
fi

echo "Proxy pret (Cloud SQL) sur le port ${PROXY_PORT}"

export TELNYX_DEBUG_WEBHOOKS=${TELNYX_DEBUG_WEBHOOKS:-1}

echo "Lancement du serveur de developpement (Frontend + Backend)..."
echo ""
npm run dev &

PRISMA_STUDIO_ENABLED=${PRISMA_STUDIO_ENABLED:-1}
PRISMA_STUDIO_PORT=${PRISMA_STUDIO_PORT:-5555}
if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
    echo ""
    echo "Lancement de Prisma Studio (port ${PRISMA_STUDIO_PORT})..."
    npx prisma studio --port "${PRISMA_STUDIO_PORT}" --hostname 0.0.0.0 >/dev/null 2>&1 &
fi

sleep 3
echo ""
echo "Environnement de developpement pret!"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:4000"
echo "  DB: Proxy Cloud SQL sur localhost:${PROXY_PORT}"

AUTO_OPEN_TOOLS=${AUTO_OPEN_TOOLS:-1}
if [ "$AUTO_OPEN_TOOLS" = "1" ]; then
    FRONT_URL_1=$(get_public_url 5173 "/connexion?open=1")
    FRONT_URL_2=$(get_public_url 5173 "/connexion?open=2")
    PRISMA_URL=$(get_public_url "${PRISMA_STUDIO_PORT}" "/")

    echo ""
    echo "Ouverture automatique (si possible) :"
    echo "  - $FRONT_URL_1"
    echo "  - $FRONT_URL_2"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "  - $PRISMA_URL"
    fi

    open_url "$FRONT_URL_1"
    open_url "$FRONT_URL_2"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        sleep 2
        open_url "$PRISMA_URL"
    fi
fi

if [ -n "${CODESPACES:-}" ] || [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
    echo ""
    echo "URL Codespaces:"
    echo "  Frontend: https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    echo "  Backend: https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "  Prisma Studio: https://${CODESPACE_NAME}-${PRISMA_STUDIO_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    fi
    echo ""
    echo "Rends les ports 5173 et 4000 PUBLIC dans l'onglet Ports."
    if [ "$PRISMA_STUDIO_ENABLED" = "1" ]; then
        echo "Rends aussi le port ${PRISMA_STUDIO_PORT} PUBLIC (Prisma Studio)."
    fi
fi

echo ""
echo "Pour modifier le code: edite puis relance 'bash scripts/start-local.sh'"
echo "Pour fermer tout: Ctrl+C ici"
echo ""

wait
