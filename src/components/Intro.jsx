import i1 from '../assets/photos/hlinenka-galerie-01.webp';
import i2 from '../assets/photos/hlinenka-galerie-04.webp';
import i3 from '../assets/photos/hlinenka-galerie-02.webp';
import i4 from '../assets/photos/hlinenka-galerie-05.webp';
import i5 from '../assets/photos/hlinenka-galerie-03.webp';
import i6 from '../assets/photos/stodola-interier-uprav.jpg';
import brush from '../assets/figma/brush-intro.svg';
import { SectionHead } from './ui.jsx';
import './Intro.css';

// m = pořadí na mobilu, wide = na mobilu přes celou šířku (fotky na šířku)
const COLUMNS = [
  [
    { src: i1, alt: 'Obývací pokoj s krbem, dřevěným obkladem a zelenou pohovkou', tall: true, m: 2 },
    { src: i2, alt: 'Chata Hliněnka z čelního pohledu na podzim', m: 1, wide: true },
  ],
  [
    { src: i3, alt: 'Chata Hliněnka a stodola ve večerním světle', m: 4, wide: true },
    { src: i4, alt: 'Obývací pokoj s kuchyní a jídelním stolem', tall: true, m: 3 },
  ],
  [
    { src: i5, alt: 'Koupelna s černou vanou a sprchou', tall: true, m: 5 },
    { src: i6, alt: 'Interiér stodoly s dlouhými dřevěnými stoly', m: 6 },
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
                  key={img.alt}
                  className={`intro__img ${img.tall ? 'is-tall' : ''} ${img.wide ? 'is-wide' : ''}`}
                  data-reveal="clip"
                  style={{ '--d': `${c * 120 + r * 180}ms`, '--m': img.m, '--pos': img.pos }}
                >
                  <img src={img.src} alt={img.alt} loading="lazy" />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
