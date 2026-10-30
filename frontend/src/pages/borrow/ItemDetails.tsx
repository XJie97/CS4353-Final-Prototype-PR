import { Icon } from '../../components/Icon';
import type { BorrowItem } from './items';

export function ItemDetails({ item, onBack }: { item: BorrowItem; onBack: () => void }) {
  return <>
    <header className="details-banner">
      <button type="button" className="plain-icon" aria-label="Back to results" onClick={onBack}><Icon name="back" width={24} /></button>
    </header>
    <main className="details-scroll" id="item-details" tabIndex={-1} aria-label="Item details">
      <img className="details-photo" src={item.image} width={402} height={402} alt={item.name} />
      <div className="details-body">
        <div className="details-title-row">
          <h1>{item.title ?? item.name}</h1>
          <p><Icon name="map-pin" width={18} /><span>{item.location}</span></p>
        </div>
        <div className="details-owner">
          <Icon name="owner" width={17.625} height={18.656} />
          <span>{item.owner ?? 'Community member'}</span>
          {item.isFriend && <span role="img" aria-label="Friend"><Icon name="owner-friend" width={25.615} height={15} /></span>}
        </div>
        {item.description && <p className="details-description">{item.description}</p>}
        <div className="details-actions"><button type="button" disabled title="Borrow requests are not available in this preview">Borrow</button></div>
      </div>
    </main>
  </>;
}
