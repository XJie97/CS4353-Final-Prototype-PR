import type { HelpRequest } from './help.ts';
import type { Store } from './domain.ts';

// Historical requests are retained; a cancelled loan never reopens its request.
export function helpOutcome(store: Store, request: HelpRequest): string {
  if (request.status === 'closed') return 'Request closed';
  const loan = store.loans.find(loan => loan.id === request.loanId);
  if (loan) return `Loan ${loan.status}`;
  return request.status === 'selected' ? 'Offer selected' : 'Open request';
}

export function visibleHelpRequests(store: Store, history: boolean): HelpRequest[] {
  return (store.helpRequests ?? []).filter(request => history
    ? request.borrowerId === store.activeUserId && request.status !== 'open'
    : request.status === 'open');
}
