import { useEffect, useRef } from 'react';
import heroImg from '../assets/photos/chata-ohniste.webp';
import { ReserveButton, ScrollCue } from './ui.jsx';
import './Hero.css';

export default function Hero() {
  const bgRef = useRef(null);

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
