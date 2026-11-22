import { useCallback, useEffect, useRef, useState } from 'react';
import g1 from '../assets/photos/hlinenka-galerie-01.webp';
import g2 from '../assets/photos/hlinenka-galerie-02.webp';
import g3 from '../assets/photos/hlinenka-galerie-03.webp';
import g4 from '../assets/photos/hlinenka-galerie-04.webp';
import g5 from '../assets/photos/hlinenka-galerie-05.webp';
import g6 from '../assets/photos/hlinenka-galerie-06.webp';
import g7 from '../assets/photos/hlinenka-galerie-07.webp';
import g8 from '../assets/photos/hlinenka-galerie-08.webp';
import g9 from '../assets/photos/hlinenka-galerie-09.webp';
import g10 from '../assets/photos/stodola-terce.webp';
import g11 from '../assets/photos/obyvak-kamna.webp';
import g12 from '../assets/photos/hlinenka-galerie-12.webp';
import g13 from '../assets/photos/loznice-listy.webp';
import g14 from '../assets/photos/stodola-bar.webp';
import g15 from '../assets/photos/loznice-okno.webp';
import g16 from '../assets/photos/brizy-detail.webp';
import g17 from '../assets/photos/chata-zadni.webp';
import logoPozice8 from '../assets/hlinenka-logo-pozice-08.webp';
import { SectionHead, ReserveButton, ScrollCue, ArrowButton } from './ui.jsx';
import './Gallery.css';

const IMAGES = [
  { src: g1, alt: 'Obývací pokoj s krbem, dřevěným obkladem a zelenou pohovkou', w: 250 },
  { src: g2, alt: 'Chata Hliněnka a stodola ve večerním světle', w: 250 },
  { src: g3, alt: 'Koupelna s černou vanou a sprchou', w: 250 },
  { src: g4, alt: 'Chata Hliněnka z čelního pohledu na podzim', w: 560 },
  { src: g5, alt: 'Obývací pokoj s kuchyní a jídelním stolem', w: 560 },
  { src: g6, alt: 'Interiér stodoly s dlouhými dřevěnými stoly', w: 250 },
  { src: g7, alt: 'Boční terasa chaty s dřevěným posezením', w: 250 },
  { src: g8, alt: 'Krbová kamna a vestavěné posezení', w: 250 },
  { src: g9, alt: 'Stodola Hliněnky s venkovní terasou', w: 263 },
  { src: g10, alt: 'Podsvícený šipkový terč ve stodole', w: 263 },
  { src: g11, alt: 'Obývací pokoj s krbovými kamny a zelenou sedačkou', w: 567 },
  { src: g12, alt: 'Profesionální šipkový terč ve stodole', w: 567 },
  { src: g13, alt: 'Ložnice s povlečením s motivem listů', w: 263 },
  { src: g14, alt: 'Kuchyňka ve stodole s cihlovou stěnou', w: 263 },
  { src: g15, alt: 'Ložnice s posezením u okna', w: 567 },
  { src: g16, alt: 'Březové kmeny u vstupu do kuchyně', w: 263 },
  { src: g17, alt: 'Chata Hliněnka při západu slunce', w: 567 },
];

const ROW1 = IMAGES.slice(0, 4);
const ROW2 = IMAGES.slice(4, 8);
const CAROUSEL = IMAGES.slice(8);

function Tile({ img, index, onOpen, delay }) {
  return (
    <button
      type="button"
      className={`g-tile ${img.w >= 500 ? 'is-wide' : ''}`}
      style={{ '--w': img.w, '--d': `${delay}ms` }}
      onClick={() => onOpen(index)}
      aria-label={`Zvětšit fotografii: ${img.alt}`}
      data-reveal="zoom"
    >
      <img src={img.src} alt={img.alt} loading="lazy" />
      {index === 7 && <img className="g-tile__hlinenka-logo" src={logoPozice8} alt="Logo Chaty Hliněnka" />}
      <span className="g-tile__zoom" aria-hidden="true">
        +
      </span>
    </button>
  );
}

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  const scrollCarousel = (dir) => {
    const el = trackRef.current;
    const first = el?.querySelector('.g-tile');
    if (!el || !first) return;
    el.scrollBy({ left: dir * (first.getBoundingClientRect().width + 24), behavior: 'smooth' });
  };

  return (
    <section className="gallery" id="galerie">
      <SectionHead eyebrow="Galerie" title="Nahlédněte do atmosféry chaty" className="gallery__head" />

      <div className="gallery__rows">
        <div className="gallery__row">
          {ROW1.map((img, i) => (
            <Tile key={img.alt} img={img} index={i} onOpen={setLightbox} delay={i * 90} />
          ))}
        </div>
        <div className="gallery__row">
          {ROW2.map((img, i) => (
            <Tile key={img.alt} img={img} index={i + 4} onOpen={setLightbox} delay={i * 90} />
          ))}
        </div>

        <div className="gallery__carousel">
          <div className="gallery__track" ref={trackRef} onScroll={updateEdges}>
            {CAROUSEL.map((img, i) => (
              <Tile key={img.alt} img={img} index={i + 8} onOpen={setLightbox} delay={i * 90} />
            ))}
          </div>
          <div className="gallery__nav gallery__nav--prev">
            <ArrowButton direction="prev" tone="light" onClick={() => scrollCarousel(-1)} disabled={edges.start} label="Předchozí fotografie" />
          </div>
          <div className="gallery__nav gallery__nav--next">
            <ArrowButton direction="next" tone="light" onClick={() => scrollCarousel(1)} disabled={edges.end} label="Další fotografie" />
          </div>
        </div>
      </div>

      <div className="gallery__footer">
        <ReserveButton variant="dark" />
        <ScrollCue tone="dark" />
      </div>

      {lightbox !== null && <Lightbox index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}

function Lightbox({ index, onChange, onClose }) {
  const total = IMAGES.length;
  const go = useCallback((d) => onChange((index + d + total) % total), [index, onChange, total]);
  const touchX = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.body.classList.add('is-locked');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('is-locked');
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  const img = IMAGES[index];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie fotografií"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img key={img.src} src={img.src} alt={img.alt} />
        <figcaption>
          <span>{img.alt}</span>
          <span>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </figcaption>
      </figure>
      <div className="lightbox__prev" onClick={(e) => e.stopPropagation()}>
        <ArrowButton direction="prev" tone="light" onClick={() => go(-1)} label="Předchozí fotografie" />
      </div>
      <div className="lightbox__next" onClick={(e) => e.stopPropagation()}>
        <ArrowButton direction="next" tone="light" onClick={() => go(1)} label="Další fotografie" />
      </div>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Zavřít galerii">
        ×
      </button>
    </div>
  );
}
