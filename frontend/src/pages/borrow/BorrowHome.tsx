import { useRef, useState } from 'react';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Icon } from '../../components/Icon';
import { NeighborhoodMap } from './NeighborhoodMap';
import { filterItems, mapFeaturedItem, sampleItems, type BorrowItem } from './items';
import './borrow.css';

const categories = [...new Set([...sampleItems, mapFeaturedItem].map(item => item.category))];
const locations = [...new Set(sampleItems.map(item => item.location))];

export default function BorrowHome() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(mapFeaturedItem.id);
  const scrollArea = useRef<HTMLElement>(null);
  const filters = { query, category, location, friendsOnly };
  const visibleItems = filterItems(sampleItems, filters);
  const mapItems = filterItems([mapFeaturedItem, ...sampleItems], filters);
  const selected = mapItems.find(item => item.id === selectedId) ?? mapItems[0] ?? null;

  function selectItem(item: BorrowItem) {
    setSelectedId(item.id);
    scrollArea.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetFilters() {
    setQuery(''); setCategory('all'); setLocation('all'); setFriendsOnly(false);
    setSelectedId(mapFeaturedItem.id);
  }

  return (
    <div className="borrow-app" id="borrow">
      <a className="skip-link" href="#borrow-content">Skip to items</a>
      <header className="top-banner">
        <form className="search-field" role="search" onSubmit={event => event.preventDefault()}>
          <label className="sr-only" htmlFor="item-search">Search for an item</label>
          <input id="item-search" type="search" placeholder="Search for an item..." value={query}
            onChange={event => setQuery(event.target.value)} autoComplete="off" />
          <Icon name="search" width={18} />
        </form>
        <div className="header-actions">
          <button type="button" className="header-action" aria-label="Notifications (not available yet)" disabled>
            <Icon name="notifications" width={35} />
          </button>
          <button type="button" className="header-action" aria-label="Chats (not available yet)" disabled>
            <Icon name="chat" width={35} />
          </button>
        </div>
      </header>

      <main className="borrow-scroll" id="borrow-content" ref={scrollArea} tabIndex={-1}>
        <h1 className="sr-only">Borrow from your community</h1>
        <div className="filter-bar" role="group" aria-label="Filter items">
          <label className="select-field">
            <span className="sr-only">Category</span>
            <select value={category} onChange={event => setCategory(event.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(value => <option key={value}>{value}</option>)}
            </select>
            <Icon name="chevron-down" width={16} />
          </label>
          <label className="select-field select-field--location">
            <span className="sr-only">Location</span>
            <Icon name="map-pin" width={18} />
            <select value={location} onChange={event => setLocation(event.target.value)}>
              <option value="all">Nearby</option>
              {locations.map(value => <option key={value}>{value}</option>)}
            </select>
            <Icon name="chevron-down" width={16} />
          </label>
          <button className="friends-filter" type="button" aria-pressed={friendsOnly}
            onClick={() => setFriendsOnly(value => !value)}>Friends only</button>
        </div>

        <NeighborhoodMap items={mapItems} selected={selected} onSelect={setSelectedIdFromItem} />

        <section className="items-section" aria-label="Items available to borrow">
          <p className="sr-only" role="status" aria-live="polite">{visibleItems.length} items found</p>
          {visibleItems.length > 0 ? (
            <div className="item-grid">
              {visibleItems.map(item => (
                <button className="item-card" key={item.id} type="button" onClick={() => selectItem(item)}
                  aria-label={`Show ${item.name} on the neighborhood map`}>
                  <img className="item-photo" src={item.image} alt="" width={166} height={166} />
                  <span className="item-name">{item.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No items found</h2>
              <p>Try another search or adjust your filters.</p>
              <button type="button" onClick={resetFilters}>Clear filters</button>
            </div>
          )}
        </section>
      </main>
      <BottomNavigation />
    </div>
  );

  function setSelectedIdFromItem(item: BorrowItem) { setSelectedId(item.id); }
}
