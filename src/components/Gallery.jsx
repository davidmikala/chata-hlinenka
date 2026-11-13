import { useCallback, useEffect, useRef, useState } from 'react';
import g1 from '../assets/figma/gallery-1.webp';
import g2 from '../assets/figma/gallery-2.webp';
import g3 from '../assets/figma/gallery-3.webp';
import g4 from '../assets/figma/gallery-4.webp';
import g5 from '../assets/figma/gallery-5.webp';
import g6 from '../assets/figma/gallery-6.webp';
import g7 from '../assets/figma/gallery-7.webp';
import g8 from '../assets/figma/gallery-8.webp';
import g9 from '../assets/figma/gallery-9.webp';
import g10 from '../assets/figma/gallery-10.webp';
import g11 from '../assets/figma/gallery-11.webp';
import g12 from '../assets/figma/gallery-12.webp';
import { SectionHead, ReserveButton, ScrollCue, ArrowButton } from './ui.jsx';
import './Gallery.css';

const IMAGES = [
  { src: g1, alt: 'Interiér s velkým oknem do lesa', w: 250 },
  { src: g2, alt: 'Ložnice s dřevěným obložením', w: 250 },
  { src: g3, alt: 'Domek na kůlech uprostřed lesa', w: 250 },
  { src: g4, alt: 'Dřevěný dům mezi břízami', w: 560 },
  { src: g5, alt: 'Krajina kolem chaty z dronu', w: 560 },
  { src: g6, alt: 'Posezení u okna s výhledem', w: 250 },
  { src: g7, alt: 'Obývací kout s výhledem do krajiny', w: 250 },
  { src: g8, alt: 'Koupelna s volně stojící vanou', w: 250 },
  { src: g9, alt: 'Večer u krbu s přáteli', w: 263 },
  { src: g10, alt: 'Kuchyně v podkroví', w: 263 },
  { src: g11, alt: 'Dřevěný domek u vody', w: 567 },
  { src: g12, alt: 'Moderní dřevěná architektura', w: 567 },
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
