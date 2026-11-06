import { Icon } from '../../components/Icon';
import { UserChip } from '../../components/ui/UserChip';
import { JourneyStrip } from '../../components/ui/JourneyStrip';
import { TvSprite } from '../../components/sprites';
import { useOptionalApp } from '../../app/context';
import { Availability } from './Availability';
import type { BorrowItem } from './items';
import { todayLocal } from '../../app/domain';

export function ItemDetails({ item, onBack, onBorrow, onChat, onViewLoan }: { item: BorrowItem & { ownerId?: string }; onBack: () => void; onBorrow?: () => void; onChat?: (ownerId: string) => void; onViewLoan?: (loanId: string) => void }) {
  const app = useOptionalApp();
  const owner = app?.store.people.find(p => p.id === item.ownerId);
  const ownerName = owner?.name ?? item.owner ?? 'owner';
  const title = item.title ?? item.name;
  // The viewer's loan that covers today, if they currently have this item.
  const today = todayLocal();
  const myLoan = app?.store.loans.find(l => l.itemId === item.id && l.borrowerId === app.store.activeUserId
    && !['complete', 'declined', 'cancelled'].includes(l.status) && l.start <= today && today <= l.end);

  return <main className="details-scroll" id="item-details" tabIndex={-1} aria-label="Item details">
    <div className="details-hero">
      <img className="details-photo" src={item.image} alt={title} />
      <button type="button" className="details-back" aria-label="Back to results" onClick={onBack}><Icon name="back" width={24} /></button>
    </div>

    <div className="details-body">
      <div className="details-row">
        <div className="details-info">
          <h1>{title}</h1>
          <UserChip person={owner} name={item.owner} isFriend={item.isFriend} />
          <p className="details-location"><Icon name="map-pin" width={18} /><span>{item.location}</span></p>
        </div>
        <div className="details-sprite">
          <TvSprite image={item.image} imageAlt={title} animation="squish" />
        </div>
      </div>

      {item.description && <p className="details-description">{item.description}</p>}

      <Availability itemId={item.id} loans={app?.store.loans} me={app?.store.activeUserId} />

      <JourneyStrip />
    </div>

    <div className="details-actions">
      {myLoan
        ? <button type="button" className="button primary" disabled={!onViewLoan} onClick={() => onViewLoan?.(myLoan.id)}>View my loan</button>
        : <button type="button" className="button primary" disabled={!onBorrow} onClick={onBorrow}>Borrow</button>}
      <button type="button" className="button" disabled={!onChat || !item.ownerId} onClick={() => item.ownerId && onChat?.(item.ownerId)}>Chat with {ownerName}</button>
    </div>
  </main>;
}
