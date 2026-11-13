import barnImg from '../assets/figma/barn.webp';
import { SectionHead, ReserveButton, ScrollCue } from './ui.jsx';
import './Barn.css';

const SEASONS = [
  { title: 'Léto', text: 'Letní večerní grilování s rodinou a přáteli.' },
  { title: 'Podzim', text: 'Posezení u ohně, když venku prší a ochladí se.' },
  { title: 'Zima', text: 'Setkání s přáteli v teple krbových kamen, i když venku sněží.' },
];

export default function Barn() {
  return (
    <section className="barn" id="stodola">
      <div className="container barn__inner">
        <SectionHead eyebrow="Naše stodola" title="Posezení, které nekončí s létem" tone="green">
          Co když začne pršet, venku se ochladí nebo dostanete chuť grilovat uprostřed zimy? Na Hliněnce to není žádný problém.
        </SectionHead>

        <figure className="barn__photo" data-reveal="zoom">
          <img src={barnImg} alt="Stodola s dřevěnou terasou a venkovním posezením" loading="lazy" />
        </figure>

        <p className="barn__text" data-reveal>
          Součástí našeho malého ráje je útulná stodola s celoročním využitím, kterou jsme proměnili v příjemné místo pro společné chvíle, grilování a posezení s
          rodinou či přáteli. Díky vytápění krbovými kamny si zde užijete teplo a atmosféru praskajícího dřeva, i když za okny prší, sněží nebo mrzne.
        </p>

        <div className="barn__seasons">
          {SEASONS.map((s, i) => (
            <article className="outline-card" key={s.title} data-reveal style={{ '--d': `${i * 120}ms` }}>
              <h3 className="h3">{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>

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
