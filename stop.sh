#!/usr/bin/env bash
# Konwerter Zdjęć – zatrzymywanie serwera

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$APPDIR/server.pid"
PORT=3020

STOPPED=0

# ── Próba 1: przez plik PID ────────────────────────────────────────────────
if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Zatrzymano serwer (PID $PID)"
        STOPPED=1
    fi
    rm -f "$PIDFILE"
fi

# ── Próba 2: przez lsof / fuser ───────────────────────────────────────────
if [ $STOPPED -eq 0 ]; then
    if command -v lsof &>/dev/null; then
        PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
    elif command -v fuser &>/dev/null; then
        PID=$(fuser $PORT/tcp 2>/dev/null || true)
    fi

    if [ -n "${PID:-}" ]; then
        kill $PID 2>/dev/null && echo "Zatrzymano serwer (PID $PID)" && STOPPED=1
    fi
fi

if [ $STOPPED -eq 0 ]; then
    echo "Serwer nie był uruchomiony (port $PORT wolny)."
fi
