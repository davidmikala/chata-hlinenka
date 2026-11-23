import bed from '../assets/figma/eq-bed.png';
import tub from '../assets/figma/eq-koupaci-sud.svg';
import barn from '../assets/figma/eq-stodola.svg';
import wifi from '../assets/figma/eq-wifi.svg';
import grill from '../assets/figma/eq-grill.png';
import bathroom from '../assets/figma/eq-bathroom.svg';
import snowflake from '../assets/figma/eq-snowflake.png';
import parking from '../assets/figma/eq-parking.png';
import playground from '../assets/figma/eq-playground.png';
import { SectionHead } from './ui.jsx';
import './Equipment.css';

const ITEMS = [
  { icon: bed, title: '4 ložnice', text: 'Komfortní ubytování pro 8 osob + 3 přistýlky' },
  { icon: bathroom, title: '3 koupelny', text: '3 plně vybavené koupelny' },
  { icon: barn, title: 'Stodola', text: 'Útulné místo pro společné chvíle za každého počasí' },
  { icon: grill, title: 'Gril', text: 'Venkovní gril pro společné večery s rodinou a přáteli' },
  { icon: tub, title: 'Koupací sud', text: 'Ideální místo pro relaxaci po dni stráveném v přírodě' },
  { icon: snowflake, title: 'Klimatizace', text: 'Pohodlí i během horkých letních dnů' },
  { icon: wifi, title: 'Wi-fi', text: 'Stabilní připojení pro práci i zábavu' },
  { icon: parking, title: 'Parkování', text: 'Parkování přímo u chaty až pro 5 vozidel' },
  { icon: playground, title: 'Hřiště', text: 'Zábava pro děti přímo u objektu' },
];

export default function Equipment() {
  return (
    <section className="equipment" id="vybaveni">
      <div className="container equipment__inner">
        <SectionHead eyebrow="Vybavení" title="Vše, co potřebujete pro pohodlný pobyt" tone="green">
          <p>
            Na Hliněnce jsme mysleli na každý detail, abyste si svůj pobyt mohli užít naplno a bez zbytečných starostí.
            Chceme, abyste se u nás cítili stejně pohodlně jako doma – možná ještě o něco lépe.
          </p>
          <p>
            <strong>Milovníci dobrého jídla ocení plně vybavenou kuchyni,</strong> ve které nechybí multifunkční trouba Siemens,
            indukční varná deska, kávovar, toustovač ani rychlovarná konvice. Pro společné večery je připraven plynový
            gril Weber a venkovní ohniště, u kterého si můžete posedět pod hvězdami.
          </p>
          <p>
            O vaše pohodlí se postarají čtyři dvoulůžkové pokoje s možností tří přistýlek a tři plně vybavené koupelny.
            Samozřejmostí jsou připravené ručníky a kvalitní tělová kosmetika Rituals, která dodá vašemu pobytu nádech
            malého domácího wellness.
          </p>
          <p>
            <strong>K nám si tak v podstatě stačí přibalit jen kartáček na zuby. A kdybyste náhodou zapomněli i ten,
            žádný problém – pár jich máme pro jistotu v zásobě.</strong>
          </p>
          <p>Vy si přivezte hlavně dobrou náladu. O zbytek už jsme se postarali.</p>
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
