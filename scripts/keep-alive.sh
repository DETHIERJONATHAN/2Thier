#!/bin/bash
# =============================================================================
# 🔄 Script Keep-Alive pour GitHub Codespaces
# =============================================================================
# Ce script empêche le Codespace de s'arrêter automatiquement (idle timeout)
# en générant une activité régulière.
#
# Usage:
#   bash scripts/keep-alive.sh        # Lance en arrière-plan
#   bash scripts/keep-alive.sh stop   # Arrête le keep-alive
# =============================================================================

PIDFILE="/tmp/codespace-keep-alive.pid"
LOGFILE="/tmp/codespace-keep-alive.log"
INTERVAL=60  # Secondes entre chaque "ping"

# Fonction pour arrêter le keep-alive
stop_keepalive() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null
            rm -f "$PIDFILE"
            echo "✅ Keep-alive arrêté (PID: $PID)"
        else
            rm -f "$PIDFILE"
            echo "⚠️  Processus déjà terminé"
        fi
    else
        echo "ℹ️  Aucun keep-alive en cours"
    fi
}

# Fonction keep-alive principale
run_keepalive() {
    echo "$(date): Keep-alive démarré (interval: ${INTERVAL}s)" >> "$LOGFILE"
    
    while true; do
        # Génère une activité minimale pour éviter l'idle timeout
        # - Touch un fichier temporaire
        # - Écrit dans le log
        touch /tmp/.codespace-activity
        echo "$(date): ping" >> "$LOGFILE"
        
        # Garde le log petit (max 100 lignes)
        tail -100 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
        
        sleep $INTERVAL
    done
}

# Gestion des arguments
case "${1:-start}" in
    stop)
        stop_keepalive
        exit 0
        ;;
    status)
        if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
            echo "✅ Keep-alive actif (PID: $(cat "$PIDFILE"))"
            echo "📋 Derniers logs:"
            tail -5 "$LOGFILE" 2>/dev/null
        else
            echo "❌ Keep-alive inactif"
        fi
        exit 0
        ;;
    start|*)
        # Arrêter l'ancien si existant
        stop_keepalive 2>/dev/null
        
        # Démarrer en arrière-plan
        run_keepalive &
        echo $! > "$PIDFILE"
        
        echo "✅ Keep-alive démarré en arrière-plan (PID: $!)"
        echo "   Interval: ${INTERVAL}s"
        echo "   Log: $LOGFILE"
        echo ""
        echo "💡 Pour arrêter: bash scripts/keep-alive.sh stop"
        ;;
esac
