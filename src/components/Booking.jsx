import { useMemo, useState } from 'react';
import cabinImg from '../assets/figma/booking-cabin.webp';
import brush from '../assets/figma/brush-booking.svg';
import { ScrollCue } from './ui.jsx';
import './Booking.css';

const PRICE_PER_NIGHT = 5000;
const DEPOSIT = 3000;
const MAX_GUESTS = 12;

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
};
const formatCZK = (n) => `${n.toLocaleString('cs-CZ').replace(/ /g, ' ')} CZK`;
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

function Counter({ label, hint, value, min, max, onChange }) {
  return (
    <div className="counter">
      <div className="counter__label">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
      </div>
      <div className="counter__controls">
        <button type="button" className="counter__btn counter__btn--minus" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Ubrat – ${label}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 8h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <output className="counter__value" aria-live="polite">
          {value}
        </output>
        <button type="button" className="counter__btn counter__btn--plus" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Přidat – ${label}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 8h11M8 2.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Booking() {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState('date');
  const [arrival, setArrival] = useState(toISO(addDays(today, 14)));
  const [departure, setDeparture] = useState(toISO(addDays(today, 16)));
  const [adults, setAdults] = useState(6);
  const [kids, setKids] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(true);
  const [sent, setSent] = useState(false);

  const nights = Math.max(0, Math.round((new Date(departure) - new Date(arrival)) / 86400000));
  const total = nights * PRICE_PER_NIGHT;
  const guests = adults + kids;

  const onArrival = (v) => {
    setArrival(v);
    if (v >= departure) setDeparture(toISO(addDays(new Date(v), 1)));
  };

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className="booking" id="rezervace">
      <div className="booking__brush" aria-hidden="true">
        <img src={brush} alt="" />
      </div>

      <div className="container booking__inner">
        <div className="booking__head">
          <p className="eyebrow" data-reveal>
            Rezervace
          </p>
          <h2 className="h1" data-reveal style={{ '--d': '80ms' }}>
            Váš odpočinek začíná tady
          </h2>
        </div>

        <div className="booking__widget" data-reveal="zoom" style={{ '--d': '160ms' }}>
          {/* ---------- levá část ---------- */}
          <div className="booking__form">
            <div className="booking__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'date'} className={tab === 'date' ? 'is-active' : ''} onClick={() => setTab('date')}>
                Datum
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'info'}
                className={tab === 'info' ? 'is-active' : ''}
                onClick={() => nights > 0 && setTab('info')}
              >
                Osobní informace
              </button>
              <span className="booking__tabline" style={{ '--x': tab === 'date' ? 0 : 1 }} />
            </div>

            {tab === 'date' ? (
              <div className="booking__panel" key="date">
                <div className="booking__dates">
                  <label className="date-field">
                    <span>Příjezd</span>
                    <strong>{formatDate(arrival)}</strong>
                    <input type="date" value={arrival} min={toISO(today)} onChange={(e) => onArrival(e.target.value)} aria-label="Datum příjezdu" />
                  </label>
                  <span className="booking__divider" aria-hidden="true" />
                  <label className="date-field">
                    <span>Odjezd</span>
                    <strong>{formatDate(departure)}</strong>
                    <input
                      type="date"
                      value={departure}
                      min={toISO(addDays(new Date(arrival), 1))}
                      onChange={(e) => setDeparture(e.target.value)}
                      aria-label="Datum odjezdu"
                    />
                  </label>
                  <button type="button" className={`guests-btn ${guestsOpen ? 'is-open' : ''}`} onClick={() => setGuestsOpen((v) => !v)} aria-expanded={guestsOpen}>
                    <span>Hosti</span>
                    <strong>{guests > 0 ? `${guests} ${plural(guests, 'host', 'hosté', 'hostů')}` : 'Přidat hosty'}</strong>
                  </button>
                </div>

                <div className={`booking__guests ${guestsOpen ? 'is-open' : ''}`}>
                  <div>
                    <Counter label="Dospělí" value={adults} min={1} max={MAX_GUESTS - kids} onChange={setAdults} />
                    <Counter label="Dítě" hint="do 12 let" value={kids} min={0} max={MAX_GUESTS - adults} onChange={setKids} />
                    <p className="booking__note">Chata pojme maximálně {MAX_GUESTS} osob.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="booking__panel" key="info">
                {sent ? (
                  <div className="booking__success">
                    <span className="booking__check" aria-hidden="true">
                      ✓
                    </span>
                    <h3 className="h3">Děkujeme za poptávku!</h3>
                    <p>
                      Termín {formatDate(arrival)} – {formatDate(departure)} pro {guests} {plural(guests, 'hosta', 'hosty', 'hostů')} jsme si poznamenali. Ozveme se vám
                      do 24 hodin s potvrzením a platebními údaji k záloze.
                    </p>
                  </div>
                ) : (
                  <form className="booking__fields" id="booking-form" onSubmit={submit}>
                    <label>
                      <span>Jméno a příjmení</span>
                      <input required name="name" autoComplete="name" placeholder="Jana Nováková" />
                    </label>
                    <label>
                      <span>E-mail</span>
                      <input required type="email" name="email" autoComplete="email" placeholder="jana@email.cz" />
                    </label>
                    <label>
                      <span>Telefon</span>
                      <input type="tel" name="phone" autoComplete="tel" placeholder="+420 …" />
                    </label>
                    <label className="is-wide">
                      <span>Poznámka</span>
                      <textarea name="note" rows="3" placeholder="Např. čas příjezdu, domácí mazlíček…" />
                    </label>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ---------- souhrn ---------- */}
          <aside className="booking__summary">
            <div className="booking__photo">
              <img src={cabinImg} alt="Chata v zimní krajině" loading="lazy" />
            </div>
            <h3 className="booking__name">Chata Hliněnka</h3>
            <p className="booking__desc">Útulná chata v přírodě pro dokonalý odpočinek i aktivní pobyt.</p>
            <p className="booking__price">
              <strong key={total}>{formatCZK(total)}</strong>
              <span>
                {nights} {plural(nights, 'noc', 'noci', 'nocí')} × {formatCZK(PRICE_PER_NIGHT)}
              </span>
            </p>
            <hr />
            <p className="booking__deposit">Záloha {DEPOSIT} CZK</p>
            <p className="booking__desc">Pro potvrzení rezervace je vyžadována záloha. Zbývající částku uhradíte před příjezdem nebo na místě dle domluvy.</p>
            {tab === 'date' ? (
              <button type="button" className="pill-btn" onClick={() => setTab('info')} disabled={nights === 0}>
                Pokračovat
                <span aria-hidden="true">→</span>
              </button>
            ) : sent ? (
              <button type="button" className="pill-btn" onClick={() => (setSent(false), setTab('date'))}>
                Nová poptávka
                <span aria-hidden="true">↺</span>
              </button>
            ) : (
              <button type="submit" form="booking-form" className="pill-btn">
                Odeslat poptávku
                <span aria-hidden="true">→</span>
              </button>
            )}
          </aside>
        </div>

        <div className="booking__footer">
          <p data-reveal>
            Rezervační systém zajišťuje{' '}
            <a className="booking__provider" href="https://bookujto.cz/" target="_blank" rel="noopener noreferrer">
              Bookujto
            </a>
          </p>
          <ScrollCue tone="light" />
        </div>
      </div>
    </section>
  );
}
