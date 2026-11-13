import i1 from '../assets/figma/intro-1.webp';
import i2 from '../assets/figma/intro-2.webp';
import i3 from '../assets/figma/intro-3.webp';
import i4 from '../assets/figma/intro-4.webp';
import i5 from '../assets/figma/intro-5.webp';
import i6 from '../assets/figma/intro-6.webp';
import brush from '../assets/figma/brush-intro.svg';
import { SectionHead } from './ui.jsx';
import './Intro.css';

const COLUMNS = [
  [
    { src: i1, alt: 'Dřevěná chata v zasněženém lese', tall: true },
    { src: i2, alt: 'Chata u zamrzlého jezera pod horami' },
  ],
  [
    { src: i3, alt: 'Dřevěný A-frame v lese' },
    { src: i4, alt: 'Chata v podzimních barvách', tall: true },
  ],
  [
    { src: i5, alt: 'Útulný interiér s krbem', tall: true },
    { src: i6, alt: 'Chata na zelené louce' },
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
                  className={`intro__img ${img.tall ? 'is-tall' : ''}`}
                  data-reveal="clip"
                  style={{ '--d': `${c * 120 + r * 180}ms` }}
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
