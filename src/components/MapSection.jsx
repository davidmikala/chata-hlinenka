import ContactMap from './ContactMap.jsx';
import { ReserveButton } from './ui.jsx';
import './MapSection.css';

// poloha chaty (Hlinsko pod Hostýnem, ev. č. 10)
export const MAP_URL = 'https://mapy.com/fnc/v1/showmap?center=17.6217614%2C49.3711206&zoom=16&mapset=outdoor&marker=true';

const LINES = [
  { label: 'Majitel', value: 'David Mikala' },
  { label: 'Telefon', value: '+420 605 270 444', href: 'tel:+420605270444' },
  { label: 'E-mail', value: 'david@mikala.cz', href: 'mailto:david@mikala.cz' },
  { label: 'Adresa chaty', value: 'Hlinsko pod Hostýnem, ev. č. 10', address: true },
];

export default function MapSection() {
  return (
    <section className="contact" id="kontakt">
      <div className="container contact__inner">
        <div className="contact__map" data-reveal="clip">
          <ContactMap />
        </div>

        <div className="contact__body">
          <div className="contact__titles">
            <p className="eyebrow" data-reveal>
              Kontakt
            </p>
            <h2 className="h2" data-reveal style={{ '--d': '80ms' }}>
              Těšíme se na vás
            </h2>
          </div>

          <p className="contact__text" data-reveal style={{ '--d': '160ms' }}>
            Máte dotaz k pobytu, volným termínům nebo k cestě na Hliněnku? Ozvěte se nám. Rádi vám všechno upřesníme.
          </p>

          <dl className="contact__lines" data-reveal style={{ '--d': '220ms' }}>
            {LINES.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>
                  {l.href ? <a href={l.href}>{l.value}</a> : l.address ? <address>{l.value}</address> : l.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="contact__actions" data-reveal style={{ '--d': '280ms' }}>
            <ReserveButton variant="dark" size="sm" href="mailto:david@mikala.cz?subject=Popt%C3%A1vka%20pobytu%20-%20Chata%20Hlin%C4%9Bnka">
              Napsat e-mail
            </ReserveButton>
            <a className="link" href={MAP_URL} target="_blank" rel="noopener noreferrer">
              Otevřít v Mapy.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
