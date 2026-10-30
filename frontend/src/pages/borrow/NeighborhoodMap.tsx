import { Icon } from '../../components/Icon';
import type { BorrowItem } from './items';

type Props = { items: BorrowItem[]; selected: BorrowItem | null; onSelect: (item: BorrowItem) => void };

// A schematic neighborhood matching Figma; this is not a geographic map.
export function NeighborhoodMap({ items, selected, onSelect }: Props) {
  return (
    <section className="neighborhood-map" aria-label="Browse items in the neighborhood">
      <div className="map-blocks" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
      </div>
      <div className="map-road map-road--horizontal-one" aria-hidden="true" />
      <div className="map-road map-road--horizontal-two" aria-hidden="true" />
      <div className="map-road map-road--vertical-one" aria-hidden="true" />
      <div className="map-road map-road--vertical-two" aria-hidden="true" />
      <span className="user-location" role="img" aria-label="Your location"><span /></span>
      {items.slice(0, 3).map((item, index) => (
        <button key={item.id} type="button" className={`map-pin map-pin--${index + 1}`}
          aria-label={`Show ${item.name} in ${item.location}`} aria-pressed={selected?.id === item.id}
          onClick={() => onSelect(item)}>
          <Icon name="shirt" width={20} />
        </button>
      ))}
      {selected && (
        <article className="map-item" aria-label={`${selected.name}, ${selected.location}`}>
          <img className="map-item-photo" src={selected.image} alt={selected.name} width={140} height={72} />
          <div className="map-item-info">
            <h2>{selected.name}</h2>
            <p><Icon name="map-pin" width={18} /><span>{selected.location}</span></p>
          </div>
          <Icon name="card-tail" width={14} height={8} className="map-item-tail" />
        </article>
      )}
    </section>
  );
}
