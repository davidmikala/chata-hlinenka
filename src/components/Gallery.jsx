import { useCallback, useEffect, useRef, useState } from 'react';
import { useGallery, Photo } from '../content/photos.jsx';
import { SectionHead, ReserveButton, ScrollCue, ArrowButton } from './ui.jsx';
import './Gallery.css';

// fotky galerie spravuje zákazník v administraci (/admin), výchozí jsou v content/photo-slots.js

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
      <Photo photo={img} loading="lazy" sizes="(max-width: 900px) 75vw, 600px" />
      <span className="g-tile__zoom" aria-hidden="true">
        +
      </span>
    </button>
  );
}

export default function Gallery() {
  const IMAGES = useGallery();
  const ROW1 = IMAGES.slice(0, 4);
  const ROW2 = IMAGES.slice(4, 8);
  const CAROUSEL = IMAGES.slice(8);
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
            <Tile key={i} img={img} index={i} onOpen={setLightbox} delay={i * 90} />
          ))}
        </div>
        <div className="gallery__row">
          {ROW2.map((img, i) => (
            <Tile key={i + 4} img={img} index={i + 4} onOpen={setLightbox} delay={i * 90} />
          ))}
        </div>

        <div className="gallery__carousel">
          <div className="gallery__track" ref={trackRef} onScroll={updateEdges}>
            {CAROUSEL.map((img, i) => (
              <Tile key={i + 8} img={img} index={i + 8} onOpen={setLightbox} delay={i * 90} />
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

      {lightbox !== null && <Lightbox images={IMAGES} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}

function Lightbox({ images: IMAGES, index, onChange, onClose }) {
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
        <Photo key={img.src} photo={img} sizes="100vw" style={{ objectPosition: '50% 50%' }} />
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
