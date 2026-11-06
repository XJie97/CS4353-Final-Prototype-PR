import { useState } from 'react';
import { Glyph } from '../../components/ui/shared';
import { addDays, dateLabel, todayLocal, type Loan } from '../../app/domain';

// Same rule as booking conflicts: finished, declined and cancelled loans don't hold dates.
const FREE_STATUSES = ['complete', 'declined', 'cancelled'];
const PENDING_STATUSES = ['requested', 'arranging'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const PAGE_DAYS = 14;
const LOOKAHEAD_DAYS = 61; // about two months

type DayState = 'free' | 'past' | 'taken' | 'mine' | 'mine-pending';

/** Monday of the week containing `day` (dates are YYYY-MM-DD, compared as UTC). */
function mondayOf(day: string) {
  const weekday = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7; // Mon = 0
  return addDays(day, -weekday);
}
const short = (day: string) => new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T00:00:00Z'));
const range = (a: string, b: string) => a === b ? short(a) : `${short(a)} – ${short(b)}`;

/**
 * Two-week Monday–Sunday calendar for one item, with arrows to look ahead
 * about two months. Reads live loans, so it updates as bookings change.
 * `me` is the viewer: their own bookings are highlighted rather than greyed out.
 */
export function Availability({ itemId, loans = [], me, today = todayLocal() }: { itemId: string; loans?: Loan[]; me?: string; today?: string }) {
  const [page, setPage] = useState(0);
  const firstMonday = mondayOf(today);
  const lastPage = Math.floor((Date.parse(addDays(today, LOOKAHEAD_DAYS)) - Date.parse(firstMonday)) / 86400000 / PAGE_DAYS);
  const start = addDays(firstMonday, page * PAGE_DAYS);
  const days = Array.from({ length: PAGE_DAYS }, (_, i) => addDays(start, i));

  const bookings = loans
    .filter(l => l.itemId === itemId && !FREE_STATUSES.includes(l.status) && l.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start));
  const mine = bookings.filter(l => l.borrowerId === me);
  const others = bookings.filter(l => l.borrowerId !== me);
  const covers = (l: Loan, day: string) => l.start <= day && day <= l.end;

  function stateOf(day: string): DayState {
    if (day < today) return 'past';
    const own = mine.find(l => covers(l, day));
    if (own) return PENDING_STATUSES.includes(own.status) ? 'mine-pending' : 'mine';
    return others.some(l => covers(l, day)) ? 'taken' : 'free';
  }

  // One-line summary, most relevant first.
  const myNow = mine.find(l => covers(l, today));
  const myNext = mine.find(l => l.start > today);
  const takenNow = others.find(l => covers(l, today));
  const takenNext = others.find(l => l.start > today);
  let summary: { text: string; tone: 'free' | 'mine' | 'taken' };
  if (myNow) summary = { text: `You're borrowing this until ${short(myNow.end)}`, tone: 'mine' };
  else if (takenNow) summary = { text: `Unavailable until ${short(takenNow.end)}`, tone: 'taken' };
  else if (myNext) summary = { text: `${PENDING_STATUSES.includes(myNext.status) ? 'You requested' : "You're booked for"} ${range(myNext.start, myNext.end)}`, tone: 'mine' };
  else if (takenNext) summary = { text: `Available now · taken ${range(takenNext.start, takenNext.end)}`, tone: 'free' };
  else summary = { text: 'Available now', tone: 'free' };

  const hasMine = days.some(d => stateOf(d) === 'mine');
  const hasPending = days.some(d => stateOf(d) === 'mine-pending');
  const hasTaken = days.some(d => stateOf(d) === 'taken');
  const labels: Record<DayState, string> = { free: 'available', past: 'past', taken: 'unavailable', mine: 'your booking', 'mine-pending': 'your request, awaiting approval' };

  return <section className="availability" aria-label="Availability">
    <div className="availability__head">
      <h2>Availability</h2>
      <span className={`availability__status availability__status--${summary.tone}`}>{summary.text}</span>
    </div>

    <div className="availability__nav">
      <button type="button" className="availability__arrow availability__arrow--back" aria-label="Previous two weeks" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Glyph name="chevron" size={18} /></button>
      <span aria-live="polite">{range(days[0], days[PAGE_DAYS - 1])}</span>
      <button type="button" className="availability__arrow" aria-label="Next two weeks" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}><Glyph name="chevron" size={18} /></button>
    </div>

    <div className="availability__weekdays" aria-hidden="true">{WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
    <ol className="availability__grid" aria-label={`Two weeks from ${dateLabel(days[0])}`}>
      {days.map(day => {
        const state = stateOf(day);
        return <li key={day} className={`availability__day is-${state}${day === today ? ' is-today' : ''}`} aria-label={`${dateLabel(day)}: ${labels[state]}`}>
          {new Date(day + 'T00:00:00Z').getUTCDate()}
        </li>;
      })}
    </ol>

    {(hasMine || hasPending || hasTaken) && <ul className="availability__legend">
      {hasMine && <li><i className="is-mine" />Your booking</li>}
      {hasPending && <li><i className="is-mine-pending" />Your request</li>}
      {hasTaken && <li><i className="is-taken" />Unavailable</li>}
    </ul>}
  </section>;
}
