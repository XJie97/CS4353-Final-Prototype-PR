import type { ReactNode } from 'react';

export type JourneyEntry = { id: string; content: ReactNode };

// Reviews organised like a clothesline

export function JourneyStrip({ title = "Item's Journey", entries = [], emptyText = 'No reviews yet. They\'ll appear here after people borrow this item.' }: { title?: string; entries?: JourneyEntry[]; emptyText?: string }) {
  return <section className="journey" aria-label={title}>
    <h2 className="journey__title">{title}</h2>
    {entries.length
      ? <div className="journey__rail">
        <ul className="journey__track">
          {entries.map(entry => <li key={entry.id} className="journey__card journey__card--filled">{entry.content}</li>)}
        </ul>
      </div>
      : <p className="journey__empty">{emptyText}</p>}
  </section>;
}
