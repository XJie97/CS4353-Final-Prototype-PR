import type { Store } from '../app/domain';
import { statusLabel } from './LoansPage';

const CLOSED = ['complete', 'declined', 'cancelled'];

/** Loans between you and another person: the ones still in progress, soonest first, and how many you've completed. */
export function loansBetween(store: Store, me: string, other: string) {
  const shared = store.loans.filter(l => (l.ownerId === me && l.borrowerId === other) || (l.ownerId === other && l.borrowerId === me));
  return {
    live: shared.filter(l => !CLOSED.includes(l.status)).sort((a, b) => a.start.localeCompare(b.start)),
    completed: shared.filter(l => l.status === 'complete').length,
  };
}

/** Tappable pills for loans in progress (requests, planned and active), e.g. "Borrowing Tent · Requested". */
export function LoanPills({ store, me, other, onLoan }: { store: Store; me: string; other: string; onLoan?: (id: string) => void }) {
  const { live } = loansBetween(store, me, other);
  if (!live.length) return null;
  return <div className="loan-pills">
    {live.map(loan => {
      const item = store.items.find(i => i.id === loan.itemId);
      const borrowing = loan.borrowerId === me;
      return <button key={loan.id} type="button" className={`loan-pill loan-pill--${borrowing ? 'borrow' : 'lend'}`} disabled={!onLoan} onClick={() => onLoan?.(loan.id)}>
        <span>{borrowing ? 'Borrowing' : 'Lending'} {item?.name ?? 'an item'}</span>
        <small>{statusLabel[loan.status]}</small>
      </button>;
    })}
  </div>;
}
