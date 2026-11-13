import house from '../assets/figma/fact-house.png';
import mountain from '../assets/figma/fact-mountain.webp';
import road from '../assets/figma/fact-road.webp';
import view from '../assets/figma/fact-view.webp';
import './QuickFacts.css';

const FACTS = [
  { icon: house, title: 'Naprosté soukromí', text: 'Nejbližší soused je 400 m daleko' },
  { icon: mountain, title: 'Skvělá dostupnost', text: 'Pouhých 10 minut od dálnice' },
  { icon: road, title: 'Soukromá cesta', text: 'Žádný průjezdní provoz' },
  { icon: view, title: 'Výhled na Hostýn', text: 'Poutní místo na obzoru' },
];

export default function QuickFacts() {
  return (
    <section className="facts" aria-label="Rychlá fakta">
      <ul className="facts__list container">
        {FACTS.map((f, i) => (
          <li className="fact" key={f.title} data-reveal style={{ '--d': `${i * 100}ms` }}>
            <span className="fact__icon">
              <img src={f.icon} alt="" width="30" height="30" />
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
