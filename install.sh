#!/usr/bin/env bash
# Konwerter Zdjęć – Instalator Linux
set -euo pipefail

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPNAME="Konwerter Zdjęć"
DESKTOP_FILE="$HOME/.local/share/applications/konwerter-zdjec.desktop"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e " ${GREEN}✓${NC}  $*"; }
warn() { echo -e " ${YELLOW}!${NC}  $*"; }
err()  { echo -e " ${RED}✗${NC}  $*"; }

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║    Konwerter Zdjęć – Instalator      ║"
echo " ╚══════════════════════════════════════╝"
echo ""

# ── 1. Sprawdź / zainstaluj Node.js ───────────────────────────────────────
echo "[1/4] Sprawdzanie Node.js..."

if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    ok "Node.js $NODE_VER już zainstalowany"
else
    warn "Node.js nie znaleziony. Próba instalacji..."

    if command -v apt-get &>/dev/null; then
        # Debian / Ubuntu – dodaj repozytorium NodeSource LTS
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
        # Fedora / RHEL
        sudo dnf install -y nodejs
    elif command -v pacman &>/dev/null; then
        # Arch Linux
        sudo pacman -Sy --noconfirm nodejs npm
    elif command -v zypper &>/dev/null; then
        # openSUSE
        sudo zypper install -y nodejs
    elif command -v brew &>/dev/null; then
        # Homebrew (macOS lub Linux Homebrew)
        brew install node
    else
        err "Nie rozpoznano menedżera pakietów."
        echo "    Zainstaluj Node.js ręcznie: https://nodejs.org"
        exit 1
    fi

    if ! command -v node &>/dev/null; then
        err "Instalacja Node.js nie powiodła się. Zainstaluj ręcznie."
        exit 1
    fi
    ok "Node.js $(node --version) zainstalowany"
fi

# ── 2. Uprawnienia skryptów ────────────────────────────────────────────────
echo "[2/4] Ustawianie uprawnień skryptów..."
chmod +x "$APPDIR/start.sh" "$APPDIR/stop.sh" "$APPDIR/install.sh"
ok "start.sh, stop.sh – wykonywalne"

# ── 3. Plik .desktop (launcher w menu aplikacji) ──────────────────────────
echo "[3/4] Tworzenie wpisu w menu aplikacji..."
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Konwerter Zdjęć
Comment=Konwertuj zdjęcia między formatami (JPEG, PNG, HEIC, RAW, PDF)
Exec=bash "$APPDIR/start.sh"
Icon=$APPDIR/icon.svg
Terminal=false
Categories=Graphics;Photography;
Keywords=zdjęcia;konwerter;jpeg;png;raw;heic;pdf;
StartupNotify=true
EOF

# Zaaktualizuj bazę .desktop
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
ok "Wpis .desktop: $DESKTOP_FILE"

# ── 4. Skrót na pulpicie (opcjonalnie) ────────────────────────────────────
echo "[4/4] Skrót na pulpicie..."
DESKTOP_DIR="$HOME/Desktop"
# Próbuj też lokalizacji xdg
XDG_DESK=$(xdg-user-dir DESKTOP 2>/dev/null || echo "")
[ -n "$XDG_DESK" ] && DESKTOP_DIR="$XDG_DESK"

if [ -d "$DESKTOP_DIR" ]; then
    cp "$DESKTOP_FILE" "$DESKTOP_DIR/konwerter-zdjec.desktop"
    chmod +x "$DESKTOP_DIR/konwerter-zdjec.desktop"
    ok "Skrót na pulpicie: $DESKTOP_DIR/konwerter-zdjec.desktop"
else
    warn "Pulpit nie znaleziony – pomiń ten krok"
fi

echo ""
echo -e " ${GREEN}✓ Instalacja zakończona!${NC}"
echo ""
echo "  Możesz uruchomić aplikację:"
echo "    • Z menu aplikacji: „$APPNAME""
echo "    • Lub poleceniem:   bash \"$APPDIR/start.sh\""
echo ""

read -r -p "  Otworzyć aplikację teraz? [T/n]: " OPEN
if [[ "${OPEN,,}" != "n" ]]; then
    bash "$APPDIR/start.sh" &
fi
