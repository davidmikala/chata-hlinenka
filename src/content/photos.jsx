import { createContext, useContext } from 'react';
import { createImageUrlBuilder } from '@sanity/image-url';
import project from './sanity-project.js';
import { SLOTS, GALLERY, GALLERY_WIDTHS } from './photo-slots.js';

/* ---------------------------------------------------------------
   Výchozí fotky (soubory v src/assets) – použijí se, dokud
   v administraci (Sanity) není nastavená jiná fotka.
   --------------------------------------------------------------- */
const FILES = import.meta.glob(['../assets/photos/*.webp', '../assets/figma/drone.webp'], { eager: true, import: 'default' });
const local = (file) => ({ src: FILES[`../assets/${file}`] });

const DEFAULTS = Object.fromEntries(SLOTS.map((s) => [s.key, { ...local(s.file), alt: s.alt }]));
const DEFAULT_GALLERY = GALLERY.map((g) => ({ ...local(g.file), alt: g.alt }));

/* ---------------------------------------------------------------
   Sanity
   --------------------------------------------------------------- */
export const sanityEnabled = Boolean(project.projectId);
const builder = sanityEnabled ? createImageUrlBuilder({ projectId: project.projectId, dataset: project.dataset }) : null;
const WIDTHS = [480, 800, 1200, 1600, 2200];

/** Sanity obrázek -> { src, srcSet, alt, pos } (pos = bod zájmu z administrace) */
function fromSanity(img, fallbackAlt) {
  if (!img?.asset?._ref) return null;
  const url = (w) => builder.image(img).width(w).fit('max').auto('format').quality(78).url();
  return {
    src: url(1600),
    srcSet: WIDTHS.map((w) => `${url(w)} ${w}w`).join(', '),
    alt: img.alt || fallbackAlt,
    pos: img.hotspot ? `${(img.hotspot.x * 100).toFixed(1)}% ${(img.hotspot.y * 100).toFixed(1)}%` : undefined,
  };
}

const QUERY = '*[_id == "sitePhotos"][0]';

/**
 * Načte fotky z administrace. Když Sanity není připojené, neodpovídá
 * do `timeout` ms nebo selže, vrátí výchozí fotky – web se tak vždy zobrazí.
 */
export async function loadPhotos(timeout = 2500) {
  const base = { slots: DEFAULTS, gallery: DEFAULT_GALLERY };
  if (!sanityEnabled) return base;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    // přímé API (ne apicdn): změna z administrace je vidět hned po publikování –
    // CDN by ji držela až 60 s. Pro návštěvnost chaty bezplatný tarif bohatě stačí.
    const url = `https://${project.projectId}.api.sanity.io/v${project.apiVersion}/data/query/${project.dataset}?query=${encodeURIComponent(QUERY)}`;
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return base;
    const doc = (await res.json()).result;
    if (!doc) return base;

    const slots = { ...DEFAULTS };
    for (const s of SLOTS) {
      const p = fromSanity(doc[s.key], s.alt);
      if (p) slots[s.key] = p;
    }
    const fromCms = (doc.gallery || []).map((g) => fromSanity(g, '')).filter(Boolean);
    return { slots, gallery: fromCms.length ? fromCms : DEFAULT_GALLERY };
  } catch {
    return base;
  }
}

/* ---------------------------------------------------------------
   React
   --------------------------------------------------------------- */
const PhotosContext = createContext({ slots: DEFAULTS, gallery: DEFAULT_GALLERY });
export const PhotosProvider = PhotosContext.Provider;

export const usePhoto = (key) => useContext(PhotosContext).slots[key];

/** Fotky galerie včetně šířky dlaždice (podle pozice, jako ve Figmě). */
export const useGallery = () =>
  useContext(PhotosContext).gallery.map((g, i) => ({ ...g, w: GALLERY_WIDTHS[i % GALLERY_WIDTHS.length] }));

/**
 * <Photo slot="intro1" /> – vykreslí <img> se správnou fotkou.
 * Bod zájmu z administrace se propíše do object-position (ořez na mobilu).
 * Ostatní props (loading, className, ref, …) jdou rovnou na <img>.
 */
export function Photo({ slot, photo, sizes = '100vw', alt, style, ...rest }) {
  const fromSlot = usePhoto(slot);
  const p = photo || fromSlot;
  if (!p) return null;
  return (
    <img
      src={p.src}
      srcSet={p.srcSet}
      sizes={p.srcSet ? sizes : undefined}
      alt={alt ?? p.alt}
      style={p.pos ? { objectPosition: p.pos, ...style } : style}
      {...rest}
    />
  );
}
