import type { ReactNode } from 'react';

export type JourneyEntry = { id: string; content: ReactNode };

// Reusable horizontally scrolling strip of cards, most recent first.
// Pass `entries` once reviews are wired up; until then it shows empty cards.
export function JourneyStrip({ title = 'My Journey', entries = [], placeholders = 3 }: { title?: string; entries?: JourneyEntry[]; placeholders?: number }) {
  const empty = entries.length === 0;
  return <section className="journey" aria-label={title}>
    <h2 className="journey__title">{title}</h2>
    <ul className="journey__track">
      {empty
        ? Array.from({ length: placeholders }, (_, i) => <li key={i} className="journey__card journey__card--empty" aria-hidden="true" />)
        : entries.map(entry => <li key={entry.id} className="journey__card">{entry.content}</li>)}
    </ul>
    {empty && <p className="sr-only">No journey entries yet.</p>}
  </section>;
}
