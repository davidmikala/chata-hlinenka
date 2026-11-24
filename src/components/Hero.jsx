import { useEffect, useRef, useState } from 'react';
import heroImg from '../assets/photos/chata-ohniste.webp';
import { ReserveButton, ScrollCue } from './ui.jsx';
import './Hero.css';

export default function Hero() {
  const bgRef = useRef(null);
  const [newYearAvailable, setNewYearAvailable] = useState(false);

  // Upozornění na volný Silvestr zobrazujeme pouze tehdy, pokud kalendář
  // potvrdí, že v období 29.12.2026–3.1.2027 není žádný obsazený termín.
  // Poptávky čekající na zálohu neblokují termín (dle VOP).
  useEffect(() => {
    let active = true;
    const refreshAvailability = async () => {
      try {
        const response = await fetch('/api/rezervace.php?action=calendar', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.occupied)) return;
        const noConflict = data.occupied.every((period) =>
          '2026-12-29' >= period.end || '2027-01-03' <= period.start
        );
        if (active) setNewYearAvailable(noConflict);
      } catch {
        if (active) setNewYearAvailable(false);
      }
    };
    refreshAvailability();
    const onFocus = () => refreshAvailability();
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, []);

  // jemný parallax pozadí
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        if (bgRef.current) bgRef.current.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="hero" id="top" aria-label="Úvod">
      <div className="hero__bg" ref={bgRef} aria-hidden="true">
        <img src={heroImg} alt="" fetchpriority="high" />
      </div>
      <div className="hero__overlay" aria-hidden="true" />

      <div className="hero__announcements" aria-label="Aktuální nabídka">
        <div className="hero__announcement hero__announcement--new hero-in" style={{ '--d': '950ms' }}>
          <span className="hero__announcement-kicker">NOVINKA</span>
          <strong>Nové ubytování</strong>
          <span className="hero__announcement-detail">v Hostýnských vrších</span>
        </div>
        {newYearAvailable && (
          <a className="hero__announcement hero__announcement--newyear hero-in" style={{ '--d': '1100ms' }} href="#rezervace" aria-label="Silvestr 2026 je volný, vybrat termín pobytu">
            <span className="hero__announcement-kicker">SILVESTR 2026</span>
            <strong>VOLNÝ!</strong>
            <span className="hero__announcement-detail">1–5 nocí · 40 000 Kč</span>
            <span className="hero__announcement-link">Vybrat termín <span aria-hidden="true">→</span></span>
          </a>
        )}
      </div>

      <div className="hero__content">
        <p className="eyebrow hero__eyebrow hero-in" style={{ '--d': '200ms' }}>
          chata hliněnka · hostýnské vrchy
        </p>
        <h1 className="h1 hero__title">
          <span className="hero-line">
            <span className="hero-in" style={{ '--d': '320ms' }}>
              Vaše soukromé místo
            </span>
          </span>{' '}
          <span className="hero-line">
            <span className="hero-in" style={{ '--d': '440ms' }}>
              uprostřed přírody
            </span>
          </span>
        </h1>
        <p className="hero__subtitle hero-in" style={{ '--d': '620ms' }}>
          Rodinná chata na samotě u lesa s výhledem na Svatý Hostýn
        </p>
        <div className="hero-in" style={{ '--d': '780ms' }}>
          <ReserveButton />
        </div>
      </div>

      <div className="hero__cue hero-in" style={{ '--d': '1000ms' }}>
        <ScrollCue tone="light" />
      </div>
    </section>
  );
}
