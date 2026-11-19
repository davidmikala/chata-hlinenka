import { useEffect, useRef } from 'react';
import markup from './Trips.html?raw';
import './Trips.css';

/**
 * Sekce „Kam na výlet“ – 8 tipů na výlety.
 * Obsah (Trips.html) i vzhled (Trips.css) jsou převzaté 1:1 ze stránky
 * „Chata_Hlinenka_8_vyletu“. Skripty předlohy jsou níže přepsané tak,
 * aby pracovaly jen uvnitř této sekce a šly při odpojení komponenty uklidit.
 */
function initTrips(root, signal) {
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal });
  const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  // --- Svatý Hostýn: tlačítka způsobu cesty a záložky ovládají stejný obsah
  const hostynDetails = root.querySelector('#hostynExpand');
  if (hostynDetails) {
    const modeButtons = $$('[data-hostyn-mode]');
    const tabs = $$('[data-hostyn-tab]');
    const panels = $$('[data-hostyn-panel]');
    const selectHostyn = (mode) => {
      modeButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.hostynMode === mode));
      tabs.forEach((b) => {
        const active = b.dataset.hostynTab === mode;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
        b.tabIndex = active ? 0 : -1;
      });
      panels.forEach((p) => (p.hidden = p.dataset.hostynPanel !== mode));
    };
    modeButtons.forEach((b) =>
      on(b, 'click', () => {
        selectHostyn(b.dataset.hostynMode);
        hostynDetails.open = true;
        hostynDetails.scrollIntoView({ behavior: smooth(), block: 'start' });
      }),
    );
    tabs.forEach((b) => on(b, 'click', () => selectHostyn(b.dataset.hostynTab)));
    tabs.forEach((b, i) =>
      on(b, 'keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        selectHostyn(next.dataset.hostynTab);
        next.focus();
      }),
    );
  }

  // --- ostatní výlety: rozbalení trasy
  $$('[data-toggle-trip]').forEach((button) =>
    on(button, 'click', () => {
      const details = root.querySelector(`#${button.dataset.toggleTrip}`);
      if (!details) return;
      details.open = !details.open;
      if (details.open) details.scrollIntoView({ behavior: smooth(), block: 'start' });
    }),
  );

  // --- Holešov: varianty pěšky / vlak
  const holesovDetails = root.querySelector('#holesovExpand');
  const modes = $$('[data-holesov-mode]');
  const hTabs = $$('[data-holesov-tab]');
  const hPanels = $$('[data-holesov-panel]');
  const choose = (kind) => {
    modes.forEach((b) => b.classList.toggle('is-active', b.dataset.holesovMode === kind));
    hTabs.forEach((b) => {
      const active = b.dataset.holesovTab === kind;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    hPanels.forEach((p) => (p.hidden = p.dataset.holesovPanel !== kind));
  };
  modes.forEach((b) =>
    on(b, 'click', () => {
      choose(b.dataset.holesovMode);
      if (holesovDetails) {
        holesovDetails.open = true;
        holesovDetails.scrollIntoView({ behavior: smooth(), block: 'start' });
      }
    }),
  );
  hTabs.forEach((b) => on(b, 'click', () => choose(b.dataset.holesovTab)));

  // --- rozcestník: 8 karet, po kliknutí se otevře velký detail výletu
  const cards = $$('[data-trip-open]');
  const panes = $$('[data-trip-pane]');
  const setTrip = (slug, scroll) => {
    cards.forEach((card) => card.setAttribute('aria-expanded', String(card.dataset.tripOpen === slug)));
    panes.forEach((pane) => (pane.hidden = pane.dataset.tripPane !== slug));
    if (slug && scroll) {
      const target = root.querySelector(`[data-trip-pane="${slug}"]`);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: smooth(), block: 'start' }));
    }
  };
  cards.forEach((card) =>
    on(card, 'click', () => {
      const next = card.getAttribute('aria-expanded') === 'true' ? null : card.dataset.tripOpen;
      setTrip(next, Boolean(next));
    }),
  );
  $$('[data-trip-close]').forEach((button) =>
    on(button, 'click', () => {
      const slug = button.dataset.tripClose;
      setTrip(null, false);
      const matching = cards.find((card) => card.dataset.tripOpen === slug);
      if (matching) {
        matching.focus();
        matching.scrollIntoView({ behavior: smooth(), block: 'center' });
      }
    }),
  );
}

// fotografie výletů (zdroj je uvedený u každé fotky přímo v Trips.html)
const photos = import.meta.glob('../assets/trips/*.webp', { eager: true, import: 'default' });
const html = { __html: markup.replace(/\{\{img:([\w-]+)\}\}/g, (_, key) => photos[`../assets/trips/${key}.webp`] ?? '') };

export default function Trips() {
  const ref = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    initTrips(ref.current, ctrl.signal);
    return () => ctrl.abort();
  }, []);

  return <section ref={ref} className="kv hostyn-section" id="vylety" aria-labelledby="hostynSectionTitle" dangerouslySetInnerHTML={html} />;
}
