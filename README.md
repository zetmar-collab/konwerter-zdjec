# 🖼️ Konwerter Zdjęć

Progresywna aplikacja webowa (PWA) do konwersji i kompresji zdjęć — działa w całości w przeglądarce, bez wysyłania plików na serwer.

## Funkcje

- **Konwersja formatów** — JPEG, PNG, WebP, BMP jako wyjście
- **Obsługiwane formaty wejściowe:**
  - Standardowe: JPEG, PNG, WebP, GIF, BMP, TIFF
  - Apple: HEIC / HEIF
  - RAW: DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2, PEF, SRW i inne
- **Kompresja JPEG/WebP** — presety jakości (Najwyższa / Dobra / Mała / Minimalna) + własny suwak
- **Kompresja PNG** — kwantyzacja kolorów przez UPNG.js (Lossless → 16 kolorów), redukcja rozmiaru do 85%
- **Zmiana rozmiaru** — własne wymiary (px) z blokadą proporcji
- **Eksport do PDF** — pojedynczy plik lub wszystkie zdjęcia w jednym wielostronicowym PDF
- **Batch processing** — wiele plików naraz, pobieranie jako ZIP
- **PWA** — instalacja jako aplikacja, tryb offline po pierwszym uruchomieniu

## Uruchomienie

### Windows

```bat
install.bat
```

Sprawdza/instaluje Node.js (przez winget), tworzy skrót na pulpicie i w Menu Start.

### Linux

```bash
bash install.sh
```

Wykrywa menedżer pakietów (apt / dnf / pacman / zypper / brew), instaluje Node.js, tworzy wpis `.desktop` w menu aplikacji.

### Ręcznie (Windows / Linux / macOS)

```bash
node server.js
# → http://localhost:3020
```

## Skrypty

| Plik | System | Opis |
|------|--------|------|
| `install.bat` | Windows | Instalator: Node.js + skróty |
| `start.bat` | Windows | Uruchamia serwer i otwiera przeglądarkę |
| `stop.bat` | Windows | Zatrzymuje serwer |
| `install.sh` | Linux | Instalator: Node.js + wpis .desktop |
| `start.sh` | Linux | Uruchamia serwer w tle i otwiera przeglądarkę |
| `stop.sh` | Linux | Zatrzymuje serwer |

## Wymagania

- [Node.js](https://nodejs.org) LTS (v18 lub nowszy)
- Nowoczesna przeglądarka (Chrome, Edge, Firefox, Safari)

## Biblioteki (CDN — brak npm install)

| Biblioteka | Wersja | Zastosowanie |
|------------|--------|--------------|
| [heic2any](https://github.com/alexcorvi/heic2any) | 0.0.4 | Dekodowanie HEIC/HEIF |
| [UTIF.js](https://github.com/photopea/UTIF.js) | 3.1.0 | Dekodowanie RAW (TIFF-based) |
| [UPNG.js](https://github.com/photopea/UPNG.js) | 2.1.0 | Kompresja PNG (kwantyzacja) |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Eksport do PDF |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | Pobieranie jako ZIP |

## Struktura projektu

```
konwerter-zdjec/
├── index.html      # Główna aplikacja (UI)
├── style.css       # Style (ciemny motyw)
├── app.js          # Logika: konwersja, kompresja, PDF, ZIP
├── sw.js           # Service Worker (offline)
├── manifest.json   # Konfiguracja PWA
├── icon.svg        # Ikona aplikacji
├── server.js       # Serwer HTTP (Node.js, bez zależności)
├── install.bat / install.sh
├── start.bat / start.sh
└── stop.bat / stop.sh
```

## Licencja

MIT
