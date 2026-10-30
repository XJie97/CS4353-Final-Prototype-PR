import { useEffect, useReducer, useRef } from 'react';
import { BottomNavigation } from '../../components/BottomNavigation';
import { Icon } from '../../components/Icon';
import { NeighborhoodMap } from './NeighborhoodMap';
import { SearchOverlay } from './SearchOverlay';
import { ItemDetails } from './ItemDetails';
import { allItems, categories, locations, filterItems, getBrowseItems } from './items';
import { borrowReducer, initialBorrowState } from './flow';
import './borrow.css';

function itemFromHash() {
  if (typeof window === 'undefined') return undefined;
  return allItems.find(item => window.location.hash === `#borrow/item/${item.id}`);
}

export default function BorrowHome() {
  const [state, dispatch] = useReducer(borrowReducer, initialBorrowState, initial => {
    const item = itemFromHash();
    return item ? { ...initial, view: 'details' as const, itemId: item.id } : initial;
  });
  const scrollArea = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);
  const lastOpenedItem = useRef<string | null>(null);
  const { filters } = state;
  const visibleItems = getBrowseItems(filters);
  const mapItems = filterItems(allItems, filters);
  const selected = mapItems.find(item => item.id === state.selectedMapId)
    ?? mapItems.find(item => item.id === 'cake-stand') ?? mapItems[0] ?? null;
  const detailsItem = allItems.find(item => item.id === state.itemId);

  useEffect(() => {
    function handleBack() {
      const item = itemFromHash();
      if (item) lastOpenedItem.current = item.id;
      dispatch(item ? { type: 'open-item', id: item.id } : { type: 'back-to-results' });
    }
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, []);
  useEffect(() => {
    if (state.view === 'details') document.getElementById('item-details')?.focus({ preventScroll: true });
    if (state.view === 'browse' && scrollArea.current) {
      scrollArea.current.scrollTop = savedScroll.current;
      if (lastOpenedItem.current) {
        document.getElementById(`item-${lastOpenedItem.current}`)?.focus({ preventScroll: true });
        lastOpenedItem.current = null;
      }
    }
  }, [state.view]);
  useEffect(() => { savedScroll.current = 0; if (scrollArea.current) scrollArea.current.scrollTop = 0; }, [filters]);

  function openItem(id: string) {
    savedScroll.current = scrollArea.current?.scrollTop ?? 0;
    lastOpenedItem.current = id;
    window.history.pushState(null, '', `#borrow/item/${id}`);
    dispatch({ type: 'open-item', id });
  }
  function backToResults() {
    if (window.location.hash.startsWith('#borrow/item/')) {
      // A card click has a known results entry; direct links return locally.
      if (lastOpenedItem.current) { window.history.back(); return; }
    }
    window.history.replaceState(null, '', '#borrow');
    dispatch({ type: 'back-to-results' });
  }
  function resetFilters() {
    savedScroll.current = 0;
    window.history.replaceState(null, '', '#borrow');
    dispatch({ type: 'reset' });
  }

  return (
    <div className="borrow-app" id="borrow">
      <a className="skip-link" href={state.view === 'details' ? '#item-details' : '#borrow-content'}>Skip to content</a>
      {state.view !== 'details' && <header className="top-banner">
        <button className="search-field search-trigger" type="button" aria-label="Search for an item"
          aria-haspopup="dialog" onClick={() => { savedScroll.current = scrollArea.current?.scrollTop ?? 0; dispatch({ type: 'open-search' }); }}>
          <span className={filters.query ? '' : 'search-placeholder'}>{filters.query || 'Search for an item...'}</span>
          <Icon name="search" width={18} />
        </button>
        <div className="header-actions">
          <button type="button" className="header-action" aria-label="Notifications (not available yet)" disabled><Icon name="notifications" width={35} /></button>
          <button type="button" className="header-action" aria-label="Chats (not available yet)" disabled><Icon name="chat" width={35} /></button>
        </div>
      </header>}

      <main className="borrow-scroll" id="borrow-content" ref={scrollArea} tabIndex={-1} hidden={state.view === 'details'}>
        <h1 className="sr-only">{filters.query ? `Results for ${filters.query}` : 'Borrow from your community'}</h1>
        <div className="filter-bar" role="group" aria-label="Filter items">
          <label className="select-field">
            <span className="sr-only">Category</span>
            <select value={filters.category} onChange={event => dispatch({ type: 'set-category', value: event.target.value })}>
              <option value="all">All Categories</option>
              {categories.map(value => <option key={value}>{value}</option>)}
            </select>
            <Icon name="chevron-down" width={16} />
          </label>
          <label className="select-field select-field--location">
            <span className="sr-only">Location</span>
            <Icon name="map-pin" width={18} />
            <select value={filters.location} onChange={event => dispatch({ type: 'set-location', value: event.target.value })}>
              <option value="all">Nearby</option>
              {locations.map(value => <option key={value}>{value}</option>)}
            </select>
            <Icon name="chevron-down" width={16} />
          </label>
          <button className="friends-filter" type="button" aria-pressed={filters.friendsOnly}
            onClick={() => dispatch({ type: 'toggle-friends' })}>
            {filters.friendsOnly && <Icon name="check" width={16} />}Friends only
          </button>
        </div>

        <NeighborhoodMap items={mapItems} selected={selected}
          onSelect={item => dispatch({ type: 'select-map-item', id: item.id })} onOpenItem={item => openItem(item.id)} />

        <section className="items-section" aria-label="Items available to borrow">
          <p className="sr-only" role="status" aria-live="polite">{visibleItems.length} items found</p>
          {visibleItems.length > 0 ? <div className="item-grid">
            {visibleItems.map(item => <button className="item-card" id={`item-${item.id}`} key={item.id} type="button"
              onClick={() => openItem(item.id)} aria-label={`View ${item.name}`}>
              <img className="item-photo" src={item.image} alt="" width={166} height={166} />
              <span className="item-name">{item.name}</span>
            </button>)}
          </div> : <div className="empty-state">
            <h2>No items found</h2><p>Try another search or adjust your filters.</p>
            <button type="button" onClick={resetFilters}>Clear filters</button>
          </div>}
        </section>
      </main>
      {state.view === 'details' && detailsItem && <ItemDetails item={detailsItem} onBack={backToResults} />}
      <BottomNavigation onBorrow={resetFilters} />
      {state.view === 'search' && <SearchOverlay value={state.draftQuery} recentSearches={state.recentSearches}
        onChange={value => dispatch({ type: 'edit-search', value })}
        onClose={() => dispatch({ type: 'close-search' })}
        onSubmit={query => dispatch({ type: 'submit-search', query })} />}
    </div>
  );
}
