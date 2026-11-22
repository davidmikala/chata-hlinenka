// Turistická mapa Mapy.com se skutečnou polohou Chaty Hliněnka.
// Vložený rámec používá přímo mapový podklad Mapy.com – nikoli OSM/Leaflet.
export const CABIN = { lat: 49.3711206, lng: 17.6217614 };
const EMBED_URL = 'https://frame.mapy.cz/turisticka?x=17.6217614&y=49.3711206&z=15&source=coor&id=17.6217614%2C49.3711206';
const FULL_MAP_URL = 'https://mapy.com/fnc/v1/showmap?mapset=outdoor&center=17.6217614%2C49.3711206&zoom=16&marker=true';

export default function ContactMap() {
  return (
    <div className="contact-map contact-map--mapy">
      <iframe
        className="contact-map__iframe"
        src={EMBED_URL}
        title="Turistická mapa Mapy.com – Chata Hliněnka, Hlinsko pod Hostýnem"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      <a className="contact-map__open" href={FULL_MAP_URL} target="_blank" rel="noopener noreferrer">
        Zobrazit na turistické Mapy.com
      </a>
    </div>
  );
}
