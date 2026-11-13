import { SectionHead, ScrollCue } from './ui.jsx';
import './NameOrigin.css';

const CARDS = [
  {
    title: 'Hlinsko pod Hostýnem',
    text: 'Prvním je poloha chaty v malé obci Hlinsko pod Hostýnem, na úpatí Hostýnských vrchů.',
  },
  {
    title: 'Přírodní hliněné omítky',
    text: 'Tím druhým, pro nás ještě osobnějším, jsou hliněné omítky na části vnitřních stěn. Hlína dodává interiéru přirozený vzhled, útulnost a příjemnou atmosféru.',
  },
];

export default function NameOrigin() {
  return (
    <section className="origin" id="proc-hlinenka">
      <div className="container origin__inner">
        <SectionHead eyebrow="Původ jména" title="Proč právě Hliněnka?" tone="light">
          Název naší chaty nevznikl náhodou. Skrývá se za ním hned dvojí příběh.
        </SectionHead>

        <div className="origin__cards">
          {CARDS.map((c, i) => (
            <article className="outline-card" key={c.title} data-reveal style={{ '--d': `${i * 140}ms` }}>
              <span className="outline-card__num">0{i + 1}</span>
              <h3 className="h3">{c.title}</h3>
              <p>{c.text}</p>
            </article>
          ))}
        </div>

        <div className="origin__end">
          <p data-reveal>A právě spojením místa, přírodních materiálů a našeho vztahu k této chatě vzniklo jméno Hliněnka.</p>
          <p className="quote origin__claim" data-reveal style={{ '--d': '120ms' }}>
            Jednoduché, přirozené a naše.
          </p>
        </div>

        <ScrollCue tone="light" />
      </div>
    </section>
  );
}
