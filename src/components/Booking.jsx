import { useEffect, useMemo, useRef, useState } from 'react';
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

const APPROVED_PRICING = { offShort: 20000, offWeek: 28000, extraNight: 5000, summerShort: 28000, summerWeek: 35000 };

function seasonForNight(iso) {
  const md = iso.slice(5);
  if (md >= '12-22' || md < '01-03') return 'holiday';
  if (md >= '07-01' && md < '09-01') return 'summer';
  return 'off';
}

// Balíčky podle schváleného ceníku. Nezobrazovat ceny za jednotlivé dny.
// Stejná pravidla používá PHP při ukládání skutečné poptávky.
function quote(pricing, start, end) {
  if (!start || !end || end <= start) return null;
  const nights = dateDiff(start, end);
  if (!Number.isInteger(nights) || nights < 1 || nights > 60) return null;
  const p = { ...APPROVED_PRICING, ...pricing };
  const seasons = new Set();
  for (let i = 0; i < nights; i++) {
    const day = new Date(Date.parse(start + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    seasons.add(seasonForNight(day));
  }
  const type = seasons.size === 1 ? [...seasons][0] : 'mixed';
  const min = seasons.has('summer') ? 4 : 2;
  const label = {
    off: 'Mimo sezónu',
    summer: 'Letní prázdniny',
    holiday: 'Vánoce a Silvestr',
    mixed: 'Pobyt přes různá období',
  }[type];
  let total = null;
  if (nights >= min && type === 'off') {
    if (nights <= 7) {
      total = Math.min(p.offWeek, p.offShort + Math.max(0, nights - 3) * p.extraNight);
    } else {
      const weeks = Math.floor(nights / 7);
      const rest = nights % 7;
      total = weeks * p.offWeek + Math.min(p.offWeek, rest * p.extraNight);
    }
  } else if (nights >= min && type === 'summer') {
    if (nights === 4) total = p.summerShort;
    else if (nights <= 7) total = p.summerWeek;
    else {
      const weeks = Math.floor(nights / 7);
      const rest = nights % 7;
      total = weeks * p.summerWeek + rest * p.extraNight;
    }
  }
  return { nights, min, total, type, label };
}

function Month({ offset, fromMonth, today, occupied, start, end, onPick, verified }) {
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
          // Den příjezdu následujících hostů může být naším odjezdem:
          // pobyt se počítá do odjezdu, ale noc odjezdu již není obsazená.
          const canEndHere = Boolean(start && !end && day > start &&
            !occupied.some((r) => start < r.end && day > r.start));
          const canPick = verified && !past && (!unavailable || canEndHere);
          const cls = ['hcal__day', !verified ? 'is-unverified' : '', unavailable && verified ? 'is-busy' : '', chosen ? 'is-chosen' : '',
            day === start ? 'is-start' : '', day === end ? 'is-end' : '', day === today ? 'is-today' : '',
            arrival ? 'is-arrival' : '', departure ? 'is-departure' : ''].filter(Boolean).join(' ');
          return (
            <button key={day} type="button" className={cls} disabled={!canPick}
              onClick={() => onPick(day)} aria-label={dateCZ(day) + (!verified ? ' obsazenost neověřena' : unavailable ? ' obsazeno' : ' dostupné k poptávce')}
              title={!verified ? 'Obsazenost se ověřuje' : unavailable ? 'Obsazeno' : dateCZ(day)}>
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
  const [pricing, setPricing] = useState(APPROVED_PRICING);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [people, setPeople] = useState(2);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const nameInputRef = useRef(null);
  const currentQuote = quote(pricing, start, end);
  const conflict = Boolean(start && end && occupied.some((r) => start < r.end && end > r.start));
  const validDates = loaded && currentQuote && currentQuote.nights >= currentQuote.min && !conflict && start >= today;

  useEffect(() => {
    const controller = new AbortController();
    // Kalendáře se vykreslují vždy. Obsazenost pravidelně ověřujeme na serveru;
    // krátká nedostupnost nesmí skrýt celé dva měsíce.
    const refresh = async () => {
      try {
        const r = await fetch(API + '?action=calendar', { cache: 'no-store', signal: controller.signal });
        const d = await r.json();
        if (!r.ok || !d.ok || !Array.isArray(d.occupied)) throw new Error(d.message || 'Kalendář je nedostupný.');
        if (controller.signal.aborted) return;
        setOccupied(d.occupied);
        setPricing(d.pricing || APPROVED_PRICING);
        setLoaded(true);
        setLoadError('');
      } catch (e) {
        if (controller.signal.aborted) return;
        setLoaded(false);
        setLoadError('Obsazenost momentálně nelze ověřit. Kalendáře jsou zobrazené, ale termíny teď nejsou potvrzené. Zkuste to znovu za chvíli.');
      }
    };
    refresh();
    const refreshInterval = setInterval(refresh, 30000);
    return () => { clearInterval(refreshInterval); controller.abort(); };
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
      // Po označení odjezdu jsou obě data již ve formuláři.
      // Přejít rovnou na vyplnění jména stejně jako v původním vzoru.
      nameInputRef.current?.focus();
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
            {loadError && <p className="booking__alert" role="status">{loadError}</p>}
            {!loaded && !loadError && <p className="booking__hint" role="status">Ověřuji obsazené termíny…</p>}
            <div className="hcal__months" aria-label="Dva měsíce kalendáře obsazenosti">
              <Month offset={0} fromMonth={month} today={today} occupied={occupied} start={start} end={end} onPick={pick} verified={loaded} />
              <Month offset={1} fromMonth={month} today={today} occupied={occupied} start={start} end={end} onPick={pick} verified={loaded} />
            </div>
            <div className="hcal__legend">
              <span><i className="hcal__swatch is-free" /> {loaded ? 'K poptání' : 'Dostupnost neověřena'}</span>
              <span><i className="hcal__swatch is-busy" /> Obsazeno</span>
              <span><i className="hcal__swatch is-selected" /> Váš termín</span>
            </div>
            <p className="booking__hint booking__selection" role="status">
              {!loaded ? 'Výběr termínů bude aktivní po načtení ověřené obsazenosti.'
                : !start ? 'Klikněte na zelený den příjezdu a poté na den odjezdu.'
                  : !end ? `Příjezd ${dateCZ(start)}. Nyní vyberte datum odjezdu.`
                    : `Vybráno: ${dateCZ(start)} – ${dateCZ(end)} · ${currentQuote?.nights ?? 0} nocí. Termín se vyplnil do formuláře.`}
            </p>
          </div>
          <div className="booking__request-box">
            <figure className="booking__image"><img src={cabinImg} alt="Chata Hliněnka v podvečer" loading="lazy" /></figure>
            <h3>Poptávka ubytování</h3>
            <p>Odesláním poptávky nevzniká závazná rezervace. Termín zablokujeme až po našem potvrzení.</p>
            <div className="booking__rules" aria-label="Pravidla ubytování">
              <p><strong>Bez domácích zvířat</strong> – vstup do areálu není povolen.</p>
              <p><strong>Nekuřácké ubytování</strong> – zákaz kouření ve všech budovách včetně stodoly.</p>
            </div>
            <form onSubmit={submit} className="booking__request-form">
              <div className="booking__input-row">
                <label>Příjezd <input required type="date" min={today} value={start} onChange={(e) => onStart(e.target.value)} /></label>
                <label>Odjezd <input required type="date" min={start || today} value={end} onChange={(e) => { setEnd(e.target.value); setFeedback(null); }} /></label>
              </div>
              <div className="booking__input-row">
                <label>Jméno a příjmení <input ref={nameInputRef} required autoComplete="name" maxLength={100} value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Jméno a příjmení" /></label>
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
                    <span>{currentQuote.label} · {dateCZ(start)} – {dateCZ(end)} · {currentQuote.nights} nocí</span>
                    <strong>{currentQuote.total !== null ? currency(currentQuote.total) : 'Cena na vyžádání'}</strong>
                    {currentQuote.nights < currentQuote.min && <span className="booking__invalid">Minimální délka pobytu: {currentQuote.min} nocí.</span>}
                    <small>Cena dle schváleného ceníku za celý pobyt. Termín i konečnou cenu potvrdíme osobně. Vratná kauce 5 000 Kč není součástí ceny.</small>
                  </>
                ) : <span>Vyberte termín pro orientační kalkulaci pobytu.</span>}
              </div>
              {conflict && <p className="booking__invalid">Tento termín zasahuje do obsazenosti.</p>}
              {feedback && <p className={feedback.ok ? 'booking__success' : 'booking__alert'} role="status">{feedback.text}</p>}
              <p className="booking__terms-note">Před odesláním poptávky si prosím přečtěte <a href="/vseobecne-obchodni-podminky/" target="_blank" rel="noopener noreferrer">všeobecné obchodní a ubytovací podmínky</a>.</p>
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
