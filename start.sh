#!/usr/bin/env bash
# Konwerter Zdjęć – uruchamianie serwera (port 3020)
set -euo pipefail

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3020

# ── Otwórz przeglądarkę ───────────────────────────────────────────────────
open_browser() {
    local url="$1"
    if command -v xdg-open &>/dev/null; then
        xdg-open "$url" &>/dev/null &
    elif command -v gnome-open &>/dev/null; then
        gnome-open "$url" &>/dev/null &
    elif command -v kde-open &>/dev/null; then
        kde-open "$url" &>/dev/null &
    elif command -v open &>/dev/null; then
        open "$url" &>/dev/null &
    else
        echo "Otwórz przeglądarkę na: $url"
    fi
}

# ── Sprawdź Node.js ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "[!] Node.js nie jest zainstalowany."
    echo "    Uruchom: bash install.sh"
    exit 1
fi

# ── Sprawdź czy serwer już działa ─────────────────────────────────────────
if curl -sf "http://localhost:$PORT/" -o /dev/null 2>/dev/null; then
    echo "[i] Serwer już działa na porcie $PORT. Otwieram przeglądarkę..."
    open_browser "http://localhost:$PORT"
    exit 0
fi

# ── Uruchom serwer w tle ──────────────────────────────────────────────────
echo "Uruchamianie serwera na http://localhost:$PORT ..."
nohup node "$APPDIR/server.js" > "$APPDIR/server.log" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$APPDIR/server.pid"

# ── Poczekaj na start (max 6 sekund) ──────────────────────────────────────
for i in {1..6}; do
    sleep 1
    if curl -sf "http://localhost:$PORT/" -o /dev/null 2>/dev/null; then
        break
    fi
done

echo "Serwer uruchomiony (PID $SERVER_PID)"

open_browser "http://localhost:$PORT"
echo "Aplikacja dostępna pod: http://localhost:$PORT"
echo "Aby zatrzymać serwer: bash \"$APPDIR/stop.sh\""
