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
  components/Trips.*       výlety – převzato 1:1 ze stránky „Chata_Hlinenka_8_vyletu“
                           (Trips.html = obsah, Trips.css = styly scoped pod .kv)
  components/Pricing.*     ceník (data ze stránky „Chata_Hlinenka_aktualni_cenik“)
  data/reviews.js          recenze
  assets/figma/            grafika exportovaná z Figmy (fotky převedené do WebP)
  assets/photos/           vlastní fotky chaty (interiér, exteriér) převedené do WebP
  assets/avatars/          portréty k ukázkovým recenzím
scripts/optimize-images.mjs  převod velkých PNG z Figmy do WebP
design-assets/             originální exporty z Figmy (nejsou součástí buildu)
```

## Co je potřeba před spuštěním naostro

- **Recenze jsou fiktivní** (`src/data/reviews.js`) – nahraďte je skutečnými hodnoceními hostů.
- **Fotky v sekci Výlety** jsou uložené v `src/assets/trips/` a pocházejí z webů kudyznudy.cz,
  kromerizsko.cz, kromeriz.eu, zoozlin.eu, vychodni-morava.cz, rusava.cz a koupaliste-holesov.cz.
  Zdroj je uvedený u každé fotky v `src/components/Trips.html` – před spuštěním si ověřte svolení k jejich použití.
- **Rezervační formulář** je funkční maketa (výpočet ceny, počet hostů, formulář), ale nikam
  neodesílá data. Napojte ho na Bookujto nebo vložte jejich rezervační kalendář do `src/components/Booking.jsx`.
- Kontaktní údaje, adresa, GPS a odkazy na sociální sítě jsou převzaté z návrhu – zkontrolujte je.
