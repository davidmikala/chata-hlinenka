import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITIES, CATEGORIES } from '../data/activities.js';
import { SectionHead, ArrowButton } from './ui.jsx';
import './Activities.css';

/** Kolik karet je vidět podle šířky okna (musí odpovídat CSS) */
function usePerView() {
  const get = () => (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
  const [perView, setPerView] = useState(get);
  useEffect(() => {
    const onResize = () => setPerView(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return perView;
}

export default function Activities() {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [step, setStep] = useState(0);
  const perView = usePerView();
  const trackRef = useRef(null);
  const dragState = useRef(null);
  const justDragged = useRef(false);

  const items = ACTIVITIES;
  const maxIndex = Math.max(0, items.length - perView);

  // šířka jednoho kroku = šířka karty + mezera
  const measure = useCallback(() => {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setStep(card.getBoundingClientRect().width + gap);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, perView]);

  useEffect(() => setIndex((i) => Math.min(i, maxIndex)), [maxIndex]);

  const go = (to) => setIndex(Math.max(0, Math.min(maxIndex, to)));

  // ---------- swipe / tažení myší ----------
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    dragState.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    const s = dragState.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      s.moved = true;
      trackRef.current?.setPointerCapture(s.id);
    }
    if (s.moved) {
      // na krajích klade odpor
      const atEdge = (index === 0 && dx > 0) || (index === maxIndex && dx < 0);
      setDrag(atEdge ? dx * 0.3 : dx);
    }
  };

  const onPointerUp = () => {
    const s = dragState.current;
    dragState.current = null;
    if (!s?.moved) return;
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const threshold = Math.min(80, step * 0.2);
    if (drag < -threshold) go(index + Math.max(1, Math.round(-drag / step)));
    else if (drag > threshold) go(index - Math.max(1, Math.round(drag / step)));
    setDrag(0);
  };

  // kliknutí po tažení nesmí spustit odkaz/akci
  const onClickCapture = (e) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };

  return (
    <section className="activities" id="aktivity">
      <div className="container">
        <SectionHead eyebrow="Výlety" title="Zážitky na dosah">
          Okolí nabízí pestré možnosti aktivit v každém ročním období – od sportu a výletů až po relaxaci a klidné chvíle v přírodě.
        </SectionHead>

        <div
          className="activities__viewport"
          role="region"
          aria-roledescription="karusel"
          aria-label="Výlety v okolí"
          tabIndex={0}
          onKeyDown={onKeyDown}
          data-reveal
          style={{ '--d': '120ms' }}
        >
          <ul
            ref={trackRef}
            className={`activities__track ${drag ? 'is-dragging' : ''}`}
            style={{ transform: `translate3d(${-index * step + drag}px, 0, 0)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={onClickCapture}
          >
            {items.map((a, i) => {
              const visible = i >= index && i < index + perView;
              return (
                <li
                  key={a.title}
                  className={`activity ${visible ? '' : 'is-out'}`}
                  aria-hidden={!visible}
                  style={{ '--i': i }}
                  onClick={() => !visible && go(i < index ? i : i - perView + 1)}
                >
                  <div className="activity__media">
                    <img src={a.image} alt={a.title} loading="lazy" draggable="false" />
                    <span className="activity__tag">{a.time}</span>
                  </div>
                  <div className="activity__body">
                    <p className="activity__cat">{CATEGORIES.find((c) => c.id === a.category)?.label}</p>
                    <h3 className="h3">{a.title}</h3>
                    <p className="activity__text">{a.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="activities__controls">
          <div className="activities__arrows">
            <ArrowButton direction="prev" onClick={() => go(index - 1)} disabled={index === 0} label="Předchozí výlet" />
            <ArrowButton direction="next" onClick={() => go(index + 1)} disabled={index >= maxIndex} label="Další výlet" />
          </div>
        </div>
      </div>
    </section>
  );
}
