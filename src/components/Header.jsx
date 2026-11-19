import { useEffect, useState } from 'react';
import logo from '../assets/figma/logo-round.webp';
import { ReserveButton } from './ui.jsx';
import './Header.css';

const LEFT = [
  { href: '#o-chate', label: 'O chatě' },
  { href: '#vybaveni', label: 'Vybavení' },
  { href: '#vylety', label: 'Výlety' },
];
const RIGHT = [
  { href: '#cenik', label: 'Ceník' },
  { href: '#kontakt', label: 'Kontakt' },
];
// mobilní menu má navíc galerii a rezervaci
const ALL = [LEFT[0], LEFT[1], { href: '#galerie', label: 'Galerie' }, LEFT[2], ...RIGHT, { href: '#rezervace', label: 'Rezervace' }];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  // zmenšení hlavičky po odscrollování
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // zvýraznění aktivní položky menu podle sekce ve viewportu
  useEffect(() => {
    // sekce, které nemají vlastní položku v menu, patří pod „O chatě“
    const ALIAS = { pribeh: 'o-chate', 'proc-hlinenka': 'o-chate', poloha: 'o-chate', stodola: 'o-chate', recenze: 'rezervace' };
    const navIds = new Set(ALL.map((l) => l.href.slice(1)));
    const sections = [...document.querySelectorAll('main > section[id]')];
    let raf = 0;
    // aktivní je poslední sekce, jejíž horní hrana už minula střed obrazovky
    const update = () => {
      const line = window.innerHeight * 0.45;
      let current = '';
      for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s.id;
      const id = ALIAS[current] ?? current;
      setActive(navIds.has(id) ? `#${id}` : '');
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // mobilní menu: zámek scrollu + zavření klávesou Escape
  useEffect(() => {
    document.body.classList.toggle('is-locked', open);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const close = () => mq.matches && setOpen(false);
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  const navLink = (l) => (
    <li key={l.href}>
      <a href={l.href} className={`nav__link ${active === l.href ? 'is-active' : ''}`}>
        {l.label}
      </a>
    </li>
  );

  return (
    <>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="site-header__inner">
        <nav className="nav nav--desktop" aria-label="Hlavní navigace">
          <ul className="nav__list">{LEFT.map(navLink)}</ul>
          <a href="#top" className="site-header__logo" aria-label="Chata Hliněnka – úvod">
            <img src={logo} alt="Chata Hliněnka" width="130" height="130" />
          </a>
          <div className="nav__right">
            <ul className="nav__list">{RIGHT.map(navLink)}</ul>
            <ReserveButton size="md" className="site-header__cta" />
          </div>
        </nav>

        {/* mobilní lišta */}
        <a href="#top" className="site-header__logo site-header__logo--mobile" aria-label="Chata Hliněnka – úvod">
          <img src={logo} alt="Chata Hliněnka" width="64" height="64" />
        </a>
        <button
          type="button"
          className="burger"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Zavřít menu' : 'Otevřít menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>

    {/* menu je mimo <header>, aby backdrop-filter hlavičky neomezoval position: fixed */}
    <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav aria-label="Mobilní navigace">
          <ul className="mobile-menu__list">
            {ALL.map((l, i) => (
              <li key={l.href} style={{ '--i': i }}>
                <a href={l.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
                  <span className="mobile-menu__num">0{i + 1}</span>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu__footer" style={{ '--i': ALL.length }}>
          <a href="tel:+420605270444" tabIndex={open ? 0 : -1}>
            +420 605 270 444
          </a>
          <a href="mailto:david@mikala.cz" tabIndex={open ? 0 : -1}>
            david@mikala.cz
          </a>
        </div>
    </div>
    </>
  );
}
