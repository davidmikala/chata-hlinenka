import yearImg from '../assets/photos/jidelna-krb.webp';
import summerImg from '../assets/photos/chata-veranda.webp';
import holidayImg from '../assets/photos/stodola-vecer.webp';
import { SectionHead, ReserveButton } from './ui.jsx';
import './Pricing.css';

// Ceník – údaje převzaté ze stránky „Chata_Hlinenka_aktualni_cenik“ (sekce Ceník)
const SEASONS = [
  {
    num: '01',
    period: 'Pozdní podzim · zima · jaro',
    title: 'Během roku',
    text: 'Klidné víkendy, toulky lesem a večery u kamen.',
    img: yearImg,
    alt: 'Jídelní stůl a krbová kamna v obývacím pokoji',
    prices: [
      { label: 'Týdenní pobyt', value: '28 000 Kč' },
      { label: 'Víkend (2–3 noci)', value: '20 000 Kč' },
    ],
  },
  {
    num: '02',
    period: 'Červenec · srpen',
    title: 'Letní prázdniny',
    text: 'Letní rána, lesní stezky a dlouhé večery na terase.',
    img: summerImg,
    alt: 'Chata Hliněnka s terasou a posezením venku',
    prices: [{ label: 'Týdenní pobyt', value: '35 000 Kč' }],
    hint: 'Červenec a srpen',
  },
  {
    num: '03',
    period: 'Zimní svátky',
    title: 'Vánoce a Silvestr',
    text: 'Na konci roku je nejkrásnější být spolu.',
    img: holidayImg,
    alt: 'Večerní posezení u velkého stolu ve stodole',
    prices: [
      { label: 'Vánoční pobyt', value: '35 000 Kč' },
      { label: 'Silvestr 29. 12. 2026 – 3. 1. 2027', value: '40 000 Kč' },
    ],
    hint: 'Silvestr 29. 12. 2026 – 3. 1. 2027: pevná cena 40 000 Kč za 1–5 nocí.',
  },
];

export default function Pricing() {
  return (
    <section className="pricing" id="cenik">
      <div className="container pricing__inner">
        <SectionHead eyebrow="Ceník" title="Kdy se u nás zastavíte?">
          Hliněnka je tu pro vás po celý rok. Vyberte si termín, který vám sedí – ať už toužíte po prodlouženém víkendu nebo celé dovolené.
        </SectionHead>

        <div className="pricing__grid">
          {SEASONS.map((s, i) => (
            <article className="price-card" key={s.num} data-reveal style={{ '--d': `${i * 120}ms` }}>
              <figure className="price-card__media">
                <img src={s.img} alt={s.alt} loading="lazy" />
                <span className="price-card__period">{s.period}</span>
              </figure>
              <div className="price-card__body">
                <span className="price-card__num">{s.num}</span>
                <h3 className="h3">{s.title}</h3>
                <p className="price-card__text">{s.text}</p>
                <dl className="price-card__list">
                  {s.prices.map((p) => (
                    <div className="price-line" key={p.label}>
                      <dt>{p.label}</dt>
                      <dd className={p.value.includes('Kč') ? '' : 'is-request'}>{p.value}</dd>
                    </div>
                  ))}
                </dl>
                {s.hint && <p className="price-card__hint">{s.hint}</p>}
              </div>
            </article>
          ))}
        </div>

        <div className="pricing__extras" data-reveal>
          <div className="pricing__extra">
            <span className="pricing__icon" aria-hidden="true">
              +
            </span>
            <div>
              <strong>Prodloužení pobytu</strong>
              <span>
                Další noc: <b>5 000 Kč</b>
              </span>
            </div>
          </div>
          <div className="pricing__extra">
            <span className="pricing__icon" aria-hidden="true">
              ↺
            </span>
            <div>
              <strong>Vratná kauce 5 000 Kč</strong>
              <span>Platba převodem 2 dny před příjezdem, vrácení do 5 dnů po odjezdu dle podmínek ubytování.</span>
            </div>
          </div>
          <ReserveButton variant="dark" size="sm" href="#rezervace" className="pricing__ask">
            Zeptat se na termín
          </ReserveButton>
        </div>
        <p className="pricing__terms-note">
          Pobyt je bez domácích zvířat a všechny budovy včetně stodoly jsou nekuřácké.
          Před rezervací doporučujeme přečíst si <a href="/vseobecne-obchodni-podminky/">všeobecné obchodní a ubytovací podmínky</a>.
        </p>
      </div>
    </section>
  );
}
