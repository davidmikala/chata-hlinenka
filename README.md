# Chata Hliněnka – web

Jednostránkový web podle Figma návrhu *CHATA HLINĚKA – FINAL DESIGN* (rámec „Design – Redesign v3“).
React 18 + Vite, čisté CSS (bez frameworku), žádné další runtime knihovny.

## Spuštění

```bash
npm install
npm run dev        # vývojový server na http://localhost:5174
npm run build      # produkční build do složky dist/
npm run preview    # náhled buildu
```

## Struktura

```
src/
  main.jsx, App.jsx        vstup aplikace, pořadí sekcí
  styles/global.css        design tokeny (barvy, písma), typografie, reveal animace
  hooks/useReveal.js       animace prvků při scrollu ([data-reveal])
  components/              jedna sekce = .jsx + .css
    ui.jsx / ui.css        sdílené prvky: tlačítko REZERVOVAT, strom (posun na další sekci), šipky
  data/activities.js       výlety (filtr podle kategorií)
  data/reviews.js          recenze
  assets/figma/            grafika exportovaná z Figmy (fotky převedené do WebP)
  assets/activities/       fotky nových výletů (Wikimedia Commons)
  assets/avatars/          portréty k ukázkovým recenzím
scripts/optimize-images.mjs  převod velkých PNG z Figmy do WebP
design-assets/             originální exporty z Figmy (nejsou součástí buildu)
```

## Co je potřeba před spuštěním naostro

- **Recenze jsou fiktivní** (`src/data/reviews.js`) – nahraďte je skutečnými hodnoceními hostů.
- **Fotka Zbrašovských jeskyní** je z Wikimedia Commons (CC BY-SA 3.0). Uveďte autora na webu,
  nebo ji nahraďte vlastní fotkou.
- **Rezervační formulář** je funkční maketa (výpočet ceny, počet hostů, formulář), ale nikam
  neodesílá data. Napojte ho na Bookujto nebo vložte jejich rezervační kalendář do `src/components/Booking.jsx`.
- Kontaktní údaje, adresa, GPS a odkazy na sociální sítě jsou převzaté z návrhu – zkontrolujte je.
