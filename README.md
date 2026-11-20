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
  main.jsx                 vstup: /admin = administrace fotek, jinak web (site.jsx)
  site.jsx, App.jsx        web a pořadí sekcí
  content/photo-slots.js   seznam fotek, které jde měnit v administraci (+ výchozí soubory)
  content/photos.jsx       načtení fotek ze Sanity, <Photo slot="…" />, záložní fotky
  content/sanity-project.js  projectId projektu Sanity
  admin/                   administrace (Sanity Studio) na adrese /admin
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
scripts/sanity-seed.mjs      jednorázové nahrání současných fotek do Sanity
design-assets/             originální exporty z Figmy (nejsou součástí buildu)
```

## Správa fotek (pro zákazníka)

Fotky na webu si zákazník mění sám na adrese **`/admin`** (např. `https://chata-hlinenka.vercel.app/admin`).
Přihlásí se, vybere sekci (Úvod, Vítejte, Stodola, Galerie, Ceník…), u fotky klikne na „Nahradit“
a dá **Publikovat** – změna je na webu během pár vteřin (bez nového nasazení).

- U každé fotky jde nástrojem ořezu (✂) nastavit bod, který má zůstat vidět – web podle něj ořezává
  fotky na mobilu i počítači.
- Galerie: pořadí se mění přetažením; první 4 fotky = 1. řada, další 4 = 2. řada, zbytek je v posuvníku.
- Když v administraci fotka chybí nebo Sanity neodpovídá, web použije výchozí fotku ze `src/assets`.
- Které fotky jdou měnit, určuje `src/content/photo-slots.js`.

**Jednorázové nastavení** (dělá správce webu):

1. Na [sanity.io/manage](https://www.sanity.io/manage) založit projekt s datasetem `production`
   (veřejný) a jeho ID zapsat do `src/content/sanity-project.js`.
2. V projektu → API → CORS origins přidat `https://chata-hlinenka.vercel.app` a `http://localhost:5174`
   (obojí s „Allow credentials“).
3. Nahrát současné fotky do Sanity:
   ```bash
   npx sanity login
   npx sanity exec scripts/sanity-seed.mjs --with-user-token
   ```
4. V projektu → Members pozvat zákazníka e-mailem s rolí **Editor**.

## Co je potřeba před spuštěním naostro

- **Recenze jsou fiktivní** (`src/data/reviews.js`) – nahraďte je skutečnými hodnoceními hostů.
- **Fotky v sekci Výlety** jsou uložené v `src/assets/trips/` a pocházejí z webů kudyznudy.cz,
  kromerizsko.cz, kromeriz.eu, zoozlin.eu, vychodni-morava.cz, rusava.cz a koupaliste-holesov.cz.
  Zdroj je uvedený u každé fotky v `src/components/Trips.html` – před spuštěním si ověřte svolení k jejich použití.
- **Rezervační formulář** je funkční maketa (výpočet ceny, počet hostů, formulář), ale nikam
  neodesílá data. Napojte ho na Bookujto nebo vložte jejich rezervační kalendář do `src/components/Booking.jsx`.
- Kontaktní údaje, adresa, GPS a odkazy na sociální sítě jsou převzaté z návrhu – zkontrolujte je.
