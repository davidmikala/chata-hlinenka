import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// poloha chaty (Hlinsko pod Hostýnem, ev. č. 10) – 49°22'16.0"N, 17°37'18.3"E
export const CABIN = { lat: 49.3711206, lng: 17.6217614 };
const ZOOM = 14;
const ROUTE_URL = `https://www.google.com/maps/dir/?api=1&destination=${CABIN.lat},${CABIN.lng}`;

const PIN = `
  <span class="map-pin__dot">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 11.2 12 4l9 7.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.5 10v9.5h13V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M10 19.5v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  </span>
  <span class="map-pin__pulse"></span>`;

const POPUP = `
  <strong>Chata Hliněnka</strong>
  <span>Hlinsko pod Hostýnem, ev. č. 10</span>
  <a href="${ROUTE_URL}" target="_blank" rel="noopener noreferrer">Naplánovat trasu →</a>`;

/**
 * Interaktivní mapa s polohou chaty (Leaflet + OpenStreetMap).
 * Kolečko myši a posun jedním prstem jsou vypnuté, dokud na mapu neklepnete –
 * aby mapa „nechytala“ běžné scrollování stránky.
 */
export default function ContactMap() {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const m = L.map(el.current, {
      center: [CABIN.lat, CABIN.lng],
      zoom: ZOOM,
      minZoom: 8,
      maxZoom: 18,
      scrollWheelZoom: false,
      dragging: !touch,
      zoomControl: false,
      attributionControl: true,
    });
    map.current = m;

    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(m);
    m.attributionControl.setPrefix(false);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(m);

    const icon = L.divIcon({ className: 'map-pin', html: PIN, iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -26] });
    marker.current = L.marker([CABIN.lat, CABIN.lng], { icon, title: 'Chata Hliněnka', keyboard: true })
      .addTo(m)
      .bindPopup(POPUP, { className: 'map-popup', closeButton: false, offset: [0, -2], autoPanPaddingTopLeft: [16, 66] })
      .openPopup();

    // ovládání zapnout až po kliknutí do mapy
    const enable = () => {
      m.scrollWheelZoom.enable();
      m.dragging.enable();
      setActive(true);
    };
    m.on('click focus', enable);
    m.on('popupopen', enable);

    // mapa se vykresluje uvnitř animovaného bloku – po změně velikosti přepočítat
    // (a pro jistotu i po načtení stránky / otočení telefonu)
    const refresh = () => m.invalidateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null;
    ro?.observe(el.current);
    const timer = setTimeout(refresh, 400);
    window.addEventListener('load', refresh);
    window.addEventListener('orientationchange', refresh);

    return () => {
      ro?.disconnect();
      clearTimeout(timer);
      window.removeEventListener('load', refresh);
      window.removeEventListener('orientationchange', refresh);
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  const recenter = () => {
    map.current?.flyTo([CABIN.lat, CABIN.lng], ZOOM, { duration: 0.8 });
    map.current?.once('moveend', () => marker.current?.openPopup());
  };

  return (
    <div className={`contact-map ${active ? 'is-active' : ''}`}>
      <div ref={el} className="contact-map__canvas" role="region" aria-label="Interaktivní mapa s polohou Chaty Hliněnka" />
      <button type="button" className="contact-map__recenter" onClick={recenter}>
        Zpět na chatu
      </button>
      <p className="contact-map__hint" aria-hidden="true">
        Kliknutím do mapy ji aktivujete
      </p>
    </div>
  );
}
