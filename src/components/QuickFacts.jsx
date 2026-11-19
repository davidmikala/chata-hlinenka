import house from '../assets/figma/fact-house.png';
import mountain from '../assets/figma/fact-mountain.webp';
import road from '../assets/figma/fact-road.webp';
import deer from '../assets/figma/fact-deer.svg';
import './QuickFacts.css';

const FACTS = [
  { icon: house, title: 'Naprosté soukromí', text: 'U nás je samota opravdu samota, nikde nikdo' },
  { icon: mountain, title: 'Skvělá dostupnost', text: 'Pouhých 10 minut od dálnice' },
  { icon: road, title: 'Soukromá cesta', text: 'Žádný průjezdní provoz' },
  { icon: deer, title: 'Příroda na dosah', text: 'Zvířata dávají dobrou noc', full: true },
];

export default function QuickFacts() {
  return (
    <section className="facts" aria-label="Rychlá fakta">
      <ul className="facts__list container">
        {FACTS.map((f, i) => (
          <li className="fact" key={f.title} data-reveal style={{ '--d': `${i * 100}ms` }}>
            <span className={`fact__icon ${f.full ? 'fact__icon--full' : ''}`}>
              <img src={f.icon} alt="" width={f.full ? 60 : 30} height={f.full ? 60 : 30} />
            </span>
            <span className="fact__text">
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
