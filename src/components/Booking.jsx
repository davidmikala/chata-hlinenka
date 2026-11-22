import { useEffect, useMemo, useState } from 'react';
import cabinImg from '../assets/photos/chata-vecer.webp';
import brush from '../assets/figma/brush-booking.svg';
import { ScrollCue } from './ui.jsx';
import './Booking.css';

const API = '/api/rezervace.php';
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const dateCZ = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('cs-CZ') : '—';
const dateDiff = (a, b) => (Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000;
const currency = (n) => Number(n).toLocaleString('cs-CZ') + ' Kč';
const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function quote(pricing, start, end) {
  if (!start || !end || end <= start) return null;
  const nights = dateDiff(start, end);
  if (!Number.isInteger(nights) || nights < 1 || nights > 60) return null;
  let total = 0;
  let complete = true;
  let min = 1;
  const group = new Map();
  for (let i = 0; i < nights; i++) {
    const day = new Date(Date.parse(start + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    let tariff = { name: 'Běžná sazba', price: Number(pricing.base) || 0, min: 1 };
    for (const r of pricing.rates || []) if (r.start <= day && day < r.end) tariff = r;
    const price = Number(tariff.price) || 0;
    if (price <= 0) complete = false;
    total += price;
    min = Math.max(min, Number(tariff.min) || 1);
    const key = tariff.name + '|' + price;
    const old = group.get(key) || { name: tariff.name, price, count: 0 };
    old.count += 1;
    group.set(key, old);
  }
  return { nights, min, total: complete ? total : null, groups: [...group.values()] };
}

function Month({ offset, fromMonth, today, occupied, start, end, onPick }) {
  const date = new Date(fromMonth.getFullYear(), fromMonth.getMonth() + offset, 1);
  const y = date.getFullYear(), m = date.getMonth();
  const blanks = (date.getDay() + 6) % 7;
  const length = new Date(y, m + 1, 0).getDate();
  const days = Array.from({ length }, (_, i) => toISO(new Date(y, m, i + 1)));
  return (
    <div className="hcal__month">
      <h3>{date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</h3>
      <div className="hcal__grid">
        {WEEKDAYS.map((day) => <span className="hcal__weekday" key={day}>{day}</span>)}
        {Array.from({ length: blanks }, (_, i) => <span key={'blank-' + i} aria-hidden="true" />)}
        {days.map((day) => {
          const arrival = occupied.some((r) => r.start === day);
          const departure = occupied.some((r) => r.end === day);
          const unavailable = occupied.some((r) => r.start <= day && day < r.end);
          const chosen = start && day >= start && day <= (end || start);
          const past = day < today;
          const cls = ['hcal__day', unavailable ? 'is-busy' : '', chosen ? 'is-chosen' : '',
            day === start ? 'is-start' : '', day === end ? 'is-end' : '', day === today ? 'is-today' : '',
            arrival ? 'is-arrival' : '', departure ? 'is-departure' : ''].filter(Boolean).join(' ');
          return (
            <button key={day} type="button" className={cls} disabled={past || unavailable}
              onClick={() => onPick(day)} aria-label={dateCZ(day) + (unavailable ? ' obsazeno' : ' dostupné k poptávce')}
              title={unavailable ? 'Obsazeno' : dateCZ(day)}>
              {Number(day.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Booking() {
  const today = useMemo(() => toISO(new Date()), []);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [occupied, setOccupied] = useState([]);
  const [pricing, setPricing] = useState({ base: 0, rates: [] });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [people, setPeople] = useState(2);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const currentQuote = quote(pricing, start, end);
  const conflict = Boolean(start && end && occupied.some((r) => start < r.end && end > r.start));
  const validDates = loaded && currentQuote && currentQuote.nights >= currentQuote.min && !conflict && start >= today;

  useEffect(() => {
    const controller = new AbortController();
    fetch(API + '?action=calendar', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.message || 'Kalendář je nedostupný.');
        setOccupied(Array.isArray(d.occupied) ? d.occupied : []);
        setPricing(d.pricing || { base: 0, rates: [] });
        setLoaded(true);
      })
      .catch((e) => { if (e.name !== 'AbortError') setLoadError('Obsazenost teď nelze ověřit. Poptávku nám můžete sdělit telefonicky nebo e-mailem.'); });
    return () => controller.abort();
  }, []);

  const pick = (day) => {
    setFeedback(null);
    if (!start || end || day <= start) {
      setStart(day);
      setEnd('');
    } else if (occupied.some((r) => start < r.end && day > r.start)) {
      setFeedback({ ok: false, text: 'Vybraný pobyt zasahuje do obsazeného termínu.' });
    } else {
      setEnd(day);
    }
  };
  const onStart = (v) => { setStart(v); if (end && end <= v) setEnd(''); setFeedback(null); };
  const onChange = (key, value) => { setForm((old) => ({ ...old, [key]: value })); setFeedback(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!validDates || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const r = await fetch(API + '?action=inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, people, ...form }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.message || 'Poptávku se nepodařilo odeslat.');
      setFeedback({ ok: true, text: data.message });
      if (data.notified) {
        setForm({ name: '', email: '', phone: '', message: '' });
        setStart(''); setEnd('');
      }
    } catch (e) {
      setFeedback({ ok: false, text: e.message || 'Nepodařilo se spojit s rezervačním systémem.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="booking" id="rezervace">
      <div className="booking__brush" aria-hidden="true"><img src={brush} alt="" /></div>
      <div className="container booking__inner">
        <header className="booking__head" data-reveal>
          <p className="eyebrow">Rezervace</p>
          <h2 className="h1">Vyberte si svůj termín</h2>
          <p>Na samotě u lesa. Celá chata jen pro vás. Vyberte termín a pošlete nám nezávaznou poptávku.</p>
        </header>
        <div className="booking__layout" data-reveal>
          <div className="booking__calendar-box">
            <div className="booking__box-head">
              <div>
                <h3>Kalendář obsazenosti</h3>
                <p>Potvrzené rezervace a blokace termínů</p>
              </div>
              <div className="hcal__nav">
                <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Předchozí měsíc">‹</button>
                <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Dnes</button>
                <button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Další měsíc">›</button>
              </div>
            </div>
            {loadError ? <p className="booking__alert">{loadError}</p> : !loaded ? <p className="booking__hint">Načítám obsazenost…</p> : (
              <div className="hcal__months">
                <Month offset={0} fromMonth={month} today={today} occupied={occupied} start={start} end={end} onPick={pick} />
                <Month offset={1} fromMonth={month} today={today} occupied={occupied} start={start} end={end} onPick={pick} />
              </div>
            )}
            <div className="hcal__legend">
              <span><i className="hcal__swatch is-free" /> K poptání</span>
              <span><i className="hcal__swatch is-busy" /> Obsazeno</span>
              <span><i className="hcal__swatch is-selected" /> Váš termín</span>
            </div>
            <p className="booking__hint">Klikněte na datum příjezdu a poté na datum odjezdu. Volná data jsou informativní a jejich dostupnost ještě potvrdíme.</p>
          </div>
          <div className="booking__request-box">
            <figure className="booking__image"><img src={cabinImg} alt="Chata Hliněnka v podvečer" loading="lazy" /></figure>
            <h3>Poptávka ubytování</h3>
            <p>Odesláním poptávky nevzniká závazná rezervace. Termín zablokujeme až po našem potvrzení.</p>
            <form onSubmit={submit} className="booking__request-form">
              <div className="booking__input-row">
                <label>Příjezd <input required type="date" min={today} value={start} onChange={(e) => onStart(e.target.value)} /></label>
                <label>Odjezd <input required type="date" min={start || today} value={end} onChange={(e) => { setEnd(e.target.value); setFeedback(null); }} /></label>
              </div>
              <div className="booking__input-row">
                <label>Jméno a příjmení <input required autoComplete="name" maxLength={100} value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Jméno a příjmení" /></label>
                <label>Počet osob <input required type="number" min={1} max={12} value={people} onChange={(e) => setPeople(Number(e.target.value))} /></label>
              </div>
              <div className="booking__input-row">
                <label>E-mail <input required type="email" autoComplete="email" maxLength={150} value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="vas@email.cz" /></label>
                <label>Telefon <input required type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="+420 …" /></label>
              </div>
              <label>Poznámka <textarea rows={3} maxLength={2000} value={form.message} onChange={(e) => onChange('message', e.target.value)} placeholder="Máte nějaké přání nebo dotaz?" /></label>
              <input type="text" name="website" autoComplete="off" tabIndex={-1} style={{ display: 'none' }} aria-hidden="true" />
              <div className="booking__quote" aria-live="polite">
                {currentQuote ? (
                  <>
                    <span>{dateCZ(start)} – {dateCZ(end)} · {currentQuote.nights} nocí</span>
                    <strong>{currentQuote.total !== null ? currency(currentQuote.total) : 'Cena na vyžádání'}</strong>
                    {currentQuote.nights < currentQuote.min && <span className="booking__invalid">Minimální délka: {currentQuote.min} nocí.</span>}
                    <small>Orientační částku upřesníme při potvrzení podle platného ceníku. Vratná kauce 5 000 Kč není součástí ceny.</small>
                  </>
                ) : <span>Vyberte termín pro orientační kalkulaci pobytu.</span>}
              </div>
              {conflict && <p className="booking__invalid">Tento termín zasahuje do obsazenosti.</p>}
              {feedback && <p className={feedback.ok ? 'booking__success' : 'booking__alert'} role="status">{feedback.text}</p>}
              <button className="booking__send" type="submit" disabled={!validDates || sending}>{sending ? 'Odesílám…' : 'Odeslat nezávaznou poptávku'}</button>
            </form>
          </div>
        </div>
        <div className="booking__footnote">
          <p>Rezervace potvrzujeme osobně. Dotazy: <a href="mailto:david@mikala.cz">david@mikala.cz</a> · <a href="tel:+420605270444">+420 605 270 444</a></p>
          <ScrollCue tone="light" />
        </div>
      </div>
    </section>
  );
}
