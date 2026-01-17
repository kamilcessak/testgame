# PerfectHealth - Aplikacja do śledzenia stanu zdrowia

PWA (Progressive Web App) do zarządzania pomiarami zdrowotnymi, posiłkami i kaloriami.

## Funkcjonalności

- 📊 Dashboard z podsumowaniem dziennym
- 💉 Pomiary ciśnienia krwi i wagi
- 🍽️ Śledzenie posiłków i kalorii
- 📍 Geolokacja dla pomiarów
- 📷 Zdjęcia posiłków
- 🔄 Działanie offline
- 📱 Responsywny design

## Wymagania

- Nowoczesna przeglądarka z obsługą:
  - ES6 Modules
  - IndexedDB
  - Service Workers
  - Geolocation API

## Instalacja lokalna

```bash
# Uruchom lokalny serwer HTTP (np. Python)
cd public
python3 -m http.server 8000

# Lub użyj npx
npx http-server public -p 8000
```

Aplikacja będzie dostępna pod adresem: http://localhost:8000

## Wdrożenie

Aplikacja jest gotowa do wdrożenia na:
- Netlify (drag & drop folder `public`)
- Vercel
- GitHub Pages
- Surge.sh

## Struktura projektu

```
public/
├── index.html          # Główny plik HTML
├── manifest.webmanifest # Manifest PWA
├── serviceWorker.js    # Service Worker dla offline
├── styles.css          # Style CSS
├── icons/              # Ikony aplikacji
└── src/                # Kod źródłowy
    ├── main.js         # Punkt wejścia
    ├── core/           # Moduły core (router, database)
    └── features/       # Funkcjonalności (dashboard, meals, measurements)
```

## Technologie

- Vanilla JavaScript (ES6 Modules)
- IndexedDB (przechowywanie danych)
- Service Workers (offline)
- CSS3 (responsywny design)

