import { Photo } from '../content/photos.jsx';
import brush from '../assets/figma/brush-intro.svg';
import { SectionHead } from './ui.jsx';
import './Intro.css';

// m = pořadí na mobilu, wide = na mobilu přes celou šířku (fotky na šířku)
const COLUMNS = [
  [
    { slot: 'intro1', tall: true, m: 2 },
    { slot: 'intro2', m: 1, wide: true },
  ],
  [
    { slot: 'intro3', m: 4, wide: true },
    { slot: 'intro4', tall: true, m: 3 },
  ],
  [
    { slot: 'intro5', tall: true, m: 5 },
    { slot: 'intro6', m: 6, pos: '22% 50%' },
  ],
];

export default function Intro() {
  return (
    <section className="intro section" id="o-chate">
      <div className="intro__brush" aria-hidden="true">
        <img src={brush} alt="" />
      </div>

      <div className="container intro__inner">
        <SectionHead eyebrow="Vítejte na Hliněnce" title="Místo, kde končí cesta a začíná klid">
          Představte si místo, kde vás ráno probouzí zpěv ptáků, za okny šumí les a jediným sousedem je okolní příroda. Místo, kde nemusíte nikam spěchat a kde
          můžete na chvíli zapomenout na každodenní starosti. Vítejte na Hliněnce – na naší rodinné chatě, ukryté na samotě u lesa v malebných Hostýnských
          vrších, s nádherným výhledem na Svatý Hostýn.
        </SectionHead>

        <div className="intro__grid">
          {COLUMNS.map((col, c) => (
            <div className="intro__col" key={c}>
              {col.map((img, r) => (
                <figure
                  key={img.slot}
                  className={`intro__img ${img.tall ? 'is-tall' : ''} ${img.wide ? 'is-wide' : ''}`}
                  data-reveal="clip"
                  style={{ '--d': `${c * 120 + r * 180}ms`, '--m': img.m, '--pos': img.pos }}
                >
                  <Photo slot={img.slot} loading="lazy" sizes="(max-width: 900px) 100vw, 380px" />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
