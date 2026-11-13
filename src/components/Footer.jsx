import bg from '../assets/figma/footer-bg.png';
import logo from '../assets/figma/logo-footer.webp';
import instagram from '../assets/figma/icon-instagram.svg';
import facebook from '../assets/figma/icon-facebook.svg';
import arrowUp from '../assets/figma/icon-arrow-up.svg';
import { MAP_URL } from './MapSection.jsx';
import './Footer.css';

const NAV = [
  { href: '#o-chate', label: 'O chatě' },
  { href: '#vybaveni', label: 'Vybavení' },
  { href: '#galerie', label: 'Galerie' },
  { href: '#aktivity', label: 'Aktivity' },
  { href: '#rezervace', label: 'Rezervace' },
];

export default function Footer() {
  return (
    <footer className="footer" style={{ '--footer-bg': `url(${bg})` }}>
      <div className="container footer__inner">
        <div className="footer__brand" data-reveal>
          <img className="footer__logo" src={logo} alt="Chata Hliněnka" width="198" height="132" />
          <p>Rodinná chata na samotě u lesa v Hostýnských vrších.</p>
          <div className="footer__social">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <img src={instagram} alt="" width="18" height="18" />
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <img src={facebook} alt="" width="18" height="18" />
            </a>
          </div>
        </div>

        <div className="footer__cols">
          <div className="footer__col" data-reveal style={{ '--d': '0ms' }}>
            <h3>Kde nás najdete</h3>
            <p className="footer__strong">Chata Hliněnka</p>
            <p>
              Hliněnka 12
              <br />
              790 01 Jeseník
            </p>
            <p>GPS: 50°44'45.7"N; 15°49'23.82"E</p>
            <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="footer__link footer__link--underline">
              Zobrazit na mapě
            </a>
          </div>
          <div className="footer__col" data-reveal style={{ '--d': '100ms' }}>
            <h3>Kontakt</h3>
            <a href="tel:+420777123456" className="footer__strong footer__link">
              +420 777 123 456
            </a>
            <a href="mailto:info@chatahlinenka.cz" className="footer__strong footer__link">
              info@chatahlinenka.cz
            </a>
            <p>Rádi vám poskytneme více informací a pomůžeme s výběrem vhodného termínu.</p>
          </div>
          <nav className="footer__col" aria-label="Navigace v patičce" data-reveal style={{ '--d': '200ms' }}>
            <h3>Navigace</h3>
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="footer__link">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="footer__col" data-reveal style={{ '--d': '300ms' }}>
            <h3>Provozovatel</h3>
            <p className="footer__strong">Mikala David</p>
            <p>Hliněnka 12, 790 01 Jeseník</p>
            <a href="mailto:info@mikala.cz" className="footer__link">
              info@mikala.cz
            </a>
            <a href="tel:+420777555111" className="footer__link">
              +420 777 555 111
            </a>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2026 Chata Hliněnka</p>
          <div className="footer__legal">
            <a href="#cookies" className="footer__link">
              Cookies
            </a>
            <a href="#gdpr" className="footer__link">
              GDPR
            </a>
            <a href="https://bookujto.cz/" target="_blank" rel="noopener noreferrer" className="footer__link">
              Rezervační systém Bookujto
            </a>
            <a href="#top" className="footer__top" aria-label="Zpět nahoru">
              <img src={arrowUp} alt="" width="18" height="18" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
