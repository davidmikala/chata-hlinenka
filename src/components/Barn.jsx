import { Photo } from '../content/photos.jsx';
import { SectionHead, ReserveButton, ScrollCue } from './ui.jsx';
import './Barn.css';

// pohled dovnitř stodoly
const INSIDE = [
  { slot: 'barnTable', title: 'Stůl pro celou partu' },
  { slot: 'barnKitchen', title: 'Kuchyňka a krbová kamna' },
  { slot: 'barnDarts', title: 'Šipky na dlouhé večery' },
];

export default function Barn() {
  return (
    <section className="barn" id="stodola">
      <div className="container barn__inner">
        <SectionHead eyebrow="Naše stodola" title="Posezení, které nekončí s létem" tone="green">
          Co když začne pršet, venku se ochladí nebo dostanete chuť grilovat uprostřed zimy? Na Hliněnce to není žádný problém.
        </SectionHead>

        <figure className="barn__photo" data-reveal="zoom">
          <Photo slot="barnMain" loading="lazy" sizes="(max-width: 900px) 100vw, 740px" />
        </figure>

        <p className="barn__text" data-reveal>
          Součástí našeho malého ráje je útulná stodola s celoročním využitím, kterou jsme proměnili v příjemné místo pro společné chvíle, grilování a posezení s
          rodinou či přáteli. Díky vytápění krbovými kamny si zde užijete teplo a atmosféru praskajícího dřeva, i když za okny prší, sněží nebo mrzne.
        </p>

        <ul className="barn__inside">
          {INSIDE.map((p, i) => (
            <li key={p.title} data-reveal style={{ '--d': `${i * 120}ms` }}>
              <figure className="barn__tile">
                <Photo slot={p.slot} loading="lazy" sizes="(max-width: 600px) 80vw, 380px" />
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
