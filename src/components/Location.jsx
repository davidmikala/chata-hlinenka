import { useEffect, useRef, useState } from 'react';
import droneImg from '../assets/figma/drone.webp';
import { SectionHead } from './ui.jsx';
import './Location.css';

/** Číslo, které se po zobrazení „napočítá“ */
function CountUp({ to, suffix = '' }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1600;
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(eased * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

export default function Location() {
  const imgRef = useRef(null);

  // pomalý parallax fotky z dronu
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = imgRef.current;
        if (!el) return;
        const r = el.parentElement.getBoundingClientRect();
        const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = `translate3d(0, ${progress * -60}px, 0) scale(1.12)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="location section" id="poloha">
      <div className="container location__inner">
        <SectionHead eyebrow="Poloha a soukromí" title="Na samotě, a přesto na dosah">
          Chata stojí na samotě u lesa, obklopená přírodou, bez bezprostředních sousedů a okolního ruchu. Nemusíte se tak dělit o svůj klid s ostatními rekreanty
          ani poslouchat ruch okolních chat.
        </SectionHead>

        <figure className="location__photo" data-reveal="clip">
          <img ref={imgRef} src={droneImg} alt="Chata Hliněnka z dronu, obklopená zahradou a poli" loading="lazy" />
        </figure>

        <dl className="stats">
          <div className="stat" data-reveal style={{ '--d': '0ms' }}>
            <dt className="stat__value">
              <CountUp to={400} suffix=" m" />
            </dt>
            <dd>k nejbližšímu sousedovi</dd>
          </div>
          <div className="stat" data-reveal style={{ '--d': '120ms' }}>
            <dt className="stat__value">
              <CountUp to={10} suffix=" min" />
            </dt>
            <dd>jízdy od dálnice</dd>
          </div>
          <div className="stat" data-reveal style={{ '--d': '240ms' }}>
            <dt className="stat__value">Soukromá</dt>
            <dd>příjezdová cesta jen k chatě</dd>
          </div>
        </dl>

        <p className="location__text" data-reveal>
          Přitom jste pouhých 10 minut jízdy od dálnice – Hliněnka tak nabízí vzácnou kombinaci naprostého soukromí a výborné dostupnosti. A jako malý bonus?
          Nádherný výhled na poutní místo Svatý Hostýn, který dodává tomuto místu nezaměnitelnou atmosféru.
        </p>
      </div>
    </section>
  );
}
