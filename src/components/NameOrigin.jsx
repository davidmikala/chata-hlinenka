import clayImg from '../assets/photos/hlinena-kamna.webp';
import logoImg from '../assets/photos/logo-zemite.webp';
import './NameOrigin.css';

/*
 * Původ jména – text vlevo, fotografie vpravo.
 * Dva důvody (místo + materiál) a krátká pointa.
 */
const REASONS = [
  {
    num: '01',
    label: 'Místo',
    title: (
      <>
        <em>Hlin</em>sko pod Hostýnem
      </>
    ),
    text: 'Prvním je poloha chaty v malé obci Hlinsko pod Hostýnem, na úpatí Hostýnských vrchů.',
  },
  {
    num: '02',
    label: 'Materiál',
    title: (
      <>
        Přírodní <em>hlin</em>ěné omítky
      </>
    ),
    text: 'Tím druhým, pro nás ještě osobnějším, jsou hliněné omítky na části vnitřních stěn. Hlína dodává interiéru přirozený vzhled, útulnost a příjemnou atmosféru.',
  },
];

export default function NameOrigin() {
  return (
    <section className="origin" id="proc-hlinenka">
      <div className="container origin__inner">
        <div className="origin__body">
          <p className="eyebrow" data-reveal>
            Původ jména
          </p>
          <h2 className="h2 origin__title" data-reveal style={{ '--d': '80ms' }}>
            Proč právě Hliněnka?
          </h2>
          <p className="origin__lead" data-reveal style={{ '--d': '160ms' }}>
            Název naší chaty nevznikl náhodou. Skrývá se za ním hned dvojí příběh.
          </p>

          <ol className="origin__list">
            {REASONS.map((r, i) => (
              <li className="origin__item" key={r.num} data-reveal style={{ '--d': `${220 + i * 100}ms` }}>
                <span className="origin__num">{r.num}</span>
                <div>
                  <p className="origin__label">{r.label}</p>
                  <h3 className="origin__item-title">{r.title}</h3>
                  <p className="origin__text">{r.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <blockquote className="origin__quote" data-reveal style={{ '--d': '420ms' }}>
            <p>A právě spojením místa, přírodních materiálů a našeho vztahu k této chatě vzniklo jméno Hliněnka.</p>
            <p className="quote origin__claim">Jednoduché, přirozené a naše.</p>
          </blockquote>
        </div>

        <div className="origin__media">
          <figure className="origin__photo origin__photo--main" data-reveal="clip">
            <img src={clayImg} alt="Krbová kamna s hliněnou omítkou v obývacím pokoji" loading="lazy" />
          </figure>
          <figure className="origin__photo origin__photo--small" data-reveal style={{ '--d': '200ms' }}>
            <img src={logoImg} alt="Logo Chaty Hliněnka" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
