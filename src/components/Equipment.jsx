import bed from '../assets/figma/eq-bed.png';
import sauna from '../assets/figma/eq-sauna.png';
import wifi from '../assets/figma/eq-wifi.png';
import grill from '../assets/figma/eq-grill.png';
import balcony from '../assets/figma/eq-balcony.png';
import snowflake from '../assets/figma/eq-snowflake.png';
import bicycle from '../assets/figma/eq-bicycle.png';
import parking from '../assets/figma/eq-parking.png';
import playground from '../assets/figma/eq-playground.png';
import { SectionHead } from './ui.jsx';
import './Equipment.css';

const ITEMS = [
  { icon: bed, title: '4 ložnice', text: 'Komfortní ubytování pro 12 osob s dostatkem soukromí' },
  { icon: sauna, title: 'Sauna', text: 'Ideální místo pro relaxaci po dni stráveném v přírodě' },
  { icon: wifi, title: 'Wi-fi', text: 'Stabilní připojení pro práci i zábavu' },
  { icon: grill, title: 'Gril', text: 'Venkovní gril pro společné večery s rodinou a přáteli' },
  { icon: balcony, title: 'Terasa', text: 'Příjemné posezení s výhledem do okolní přírody' },
  { icon: snowflake, title: 'Klimatizace', text: 'Pohodlí i během horkých letních dnů' },
  { icon: bicycle, title: 'Úschovna kol', text: 'Bezpečný prostor pro uložení kol a sportovního vybavení' },
  { icon: parking, title: 'Parkování', text: 'Parkování přímo u chaty až pro 5 vozidel' },
  { icon: playground, title: 'Hřiště', text: 'Zábava pro děti přímo u objektu' },
];

export default function Equipment() {
  return (
    <section className="equipment" id="vybaveni">
      <div className="container equipment__inner">
        <SectionHead eyebrow="Vybavení" title="Vše, co potřebujete pro pohodlný pobyt" tone="green">
          <p>
            Chata je plně vybavena tak, abyste si svůj pobyt mohli užít bez starostí. Najdete zde útulný interiér, moderní zázemí i praktické vybavení, které vám
            zajistí maximální komfort po celou dobu pobytu.
          </p>
          <p>Od plně vybavené kuchyně přes pohodlné spaní až po prostor pro odpočinek – vše je připraveno tak, abyste se cítili jako doma.</p>
        </SectionHead>

        <ul className="equipment__grid">
          {ITEMS.map((it, i) => (
            <li key={it.title} className="outline-card equipment__card" data-reveal style={{ '--d': `${(i % 3) * 110 + Math.floor(i / 3) * 60}ms` }}>
              <img className="equipment__icon" src={it.icon} alt="" width="50" height="50" />
              <h3 className="h3">{it.title}</h3>
              <p>{it.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
