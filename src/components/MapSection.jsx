import mapImg from '../assets/figma/map.webp';
import './MapSection.css';

export const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=50.746028,15.823283';

export default function MapSection() {
  return (
    <section className="map-section" id="kontakt">
      <div className="container map-section__inner">
        <div className="map-section__text">
          <div className="map-section__titles">
            <p className="eyebrow" data-reveal>
              Lokace
            </p>
            <h2 className="h2" data-reveal style={{ '--d': '80ms' }}>
              Kde nás najdete
            </h2>
          </div>
          <span className="map-section__line" data-reveal="left" style={{ '--d': '160ms' }} />
          <address className="map-section__address" data-reveal style={{ '--d': '220ms' }}>
            Hliněnka 12
            <br />
            790 01 Jeseník
            <br />
            Česká republika
          </address>
          <a className="link" href={MAP_URL} target="_blank" rel="noopener noreferrer" data-reveal style={{ '--d': '280ms' }}>
            Ukázat souřadnice na mapě
          </a>
        </div>

        <a className="map-section__map" href={MAP_URL} target="_blank" rel="noopener noreferrer" aria-label="Otevřít polohu v Google Mapách" data-reveal="zoom">
          <span className="map-section__frame">
            <img src={mapImg} alt="Mapa okolí chaty" loading="lazy" />
            <span className="map-section__pin" aria-hidden="true" />
            <span className="map-section__cta">Otevřít v Google Mapách ↗</span>
          </span>
        </a>
      </div>
    </section>
  );
}
