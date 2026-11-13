import starFull from '../assets/figma/star-full.svg';
import starHalf from '../assets/figma/star-half.svg';
import starEmpty from '../assets/figma/star-empty.svg';
import { REVIEWS } from '../data/reviews.js';
import { ReserveButton } from './ui.jsx';
import './Reviews.css';

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

function Stars({ rating }) {
  return (
    <span className="stars" role="img" aria-label={`Hodnocení ${String(rating).replace('.', ',')} z 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <img key={n} src={rating >= n ? starFull : rating >= n - 0.5 ? starHalf : starEmpty} alt="" width="20" height="20" />
      ))}
    </span>
  );
}

function ReviewCard({ r, dark }) {
  return (
    <article className={`review ${dark ? 'review--dark' : ''}`}>
      <header className="review__top">
        <Stars rating={r.rating} />
        <time dateTime={r.date}>{dateFmt.format(new Date(r.date))}</time>
      </header>
      <p className="review__text">„{r.text}“</p>
      <footer className="review__person">
        <img src={r.avatar} alt="" width="56" height="56" loading="lazy" />
        <div>
          <strong>{r.name}</strong>
          <span>{r.place}, Česká republika</span>
        </div>
      </footer>
    </article>
  );
}

function MarqueeRow({ items, reverse, offset = 0 }) {
  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''}`}>
      <div className="marquee__track">
        {[0, 1].map((copy) => (
          <div className="marquee__group" key={copy} aria-hidden={copy === 1}>
            {items.map((r, i) => (
              <ReviewCard key={r.name} r={r} dark={(i + offset) % 3 === 1} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reviews() {
  const avg = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;

  return (
    <section className="reviews" id="recenze">
      <div className="container reviews__head">
        <h2 className="reviews__title" data-reveal>
          <span>Přijeďte si užít chvíle,</span> které patří jen vám.
        </h2>
        <p className="reviews__lead" data-reveal style={{ '--d': '100ms' }}>
          Ať už hledáte romantický víkend ve dvou, odpočinek s rodinou, nebo jen pár dní daleko od městského ruchu, Hliněnka vám nabídne prostor zpomalit a
          načerpat novou energii.
        </p>
        <p className="reviews__score" data-reveal style={{ '--d': '180ms' }}>
          <Stars rating={Math.round(avg * 2) / 2} />
          <strong>{avg.toFixed(1).replace('.', ',')}</strong>
          <span>průměrné hodnocení · {REVIEWS.length} recenzí hostů</span>
        </p>
      </div>

      <div className="reviews__rows" data-reveal="fade" aria-label="Recenze hostů">
        <MarqueeRow items={REVIEWS.slice(0, 5)} />
        <MarqueeRow items={REVIEWS.slice(5)} reverse offset={1} />
      </div>

      <div className="container reviews__end">
        <p className="quote reviews__quote" data-reveal>
          Protože ten největší luxus je někdy právě ticho, příroda a čas strávený s těmi, na kterých nám záleží.
        </p>
        <div data-reveal style={{ '--d': '100ms' }}>
          <ReserveButton variant="primary" />
        </div>
      </div>
    </section>
  );
}
