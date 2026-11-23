import barnImg from '../assets/photos/stodola-interier-uprav.jpg';
import tableImg from '../assets/photos/stodola-stul.webp';
import kitchenImg from '../assets/photos/stodola-kuchynka.webp';
import dartsImg from '../assets/photos/stodola-sipky-uprav.jpg';
import { SectionHead, ReserveButton, ScrollCue } from './ui.jsx';
import './Barn.css';

// pohled dovnitř stodoly
const INSIDE = [
  { src: tableImg, alt: 'Velký dřevěný stůl ve stodole', title: 'Stůl pro celou partu' },
  { src: kitchenImg, alt: 'Kuchyňka s vinotékou a krbovými kamny ve stodole', title: 'Kuchyňka s vinotékou a výčepem' },
  { src: dartsImg, alt: 'Osvětlený šipkový terč s cedulí Darts Zone na dřevěné stěně stodoly', title: 'Šipky na dlouhé večery' },
];

export default function Barn() {
  return (
    <section className="barn" id="stodola">
      <div className="container barn__inner">
        <SectionHead eyebrow="Naše stodola" title="Posezení, které nekončí s létem" tone="green">
          Co když začne pršet, venku se ochladí nebo dostanete chuť grilovat uprostřed zimy? Na Hliněnce to není žádný problém.
        </SectionHead>

        <figure className="barn__photo" data-reveal="zoom">
          <img src={barnImg} alt="Interiér stodoly s dlouhými dubovými stoly, krbovými kamny a kuchyňkou" loading="lazy" />
        </figure>

        <p className="barn__text" data-reveal>
          Součástí našeho malého ráje je útulná stodola s celoročním využitím, kterou jsme proměnili v příjemné místo pro společné chvíle, grilování a posezení s
          rodinou či přáteli. Díky vytápění krbovými kamny si zde užijete teplo a atmosféru praskajícího dřeva, i když za okny prší, sněží nebo mrzne.
        </p>

        <ul className="barn__inside">
          {INSIDE.map((p, i) => (
            <li key={p.title} data-reveal style={{ '--d': `${i * 120}ms` }}>
              <figure className="barn__tile">
                <img src={p.src} alt={p.alt} loading="lazy" />
                <figcaption>{p.title}</figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <p className="quote barn__claim" data-reveal>
          U nás totiž grilovací sezóna nikdy nekončí.
        </p>

        <div data-reveal>
          <ReserveButton />
        </div>

        <ScrollCue tone="light" />
      </div>
    </section>
  );
}
