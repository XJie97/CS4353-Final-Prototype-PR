export type BorrowItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  isFriend: boolean;
  image: string;
  owner?: string;
  description?: string;
  title?: string;
};

export type BorrowFilters = {
  query: string;
  category: string;
  location: string;
  friendsOnly: boolean;
};

const placeholder = '/assets/item-placeholder.png';

// Figma fixture data for this first screen; no Supabase records are created.
export const sampleItems: BorrowItem[] = [
  { id: 'vacuum', name: 'Vacuum Cleaner model Philips', category: 'Home', location: 'Toa Payoh', isFriend: false, image: placeholder },
  { id: 'speaker', name: 'Portable speaker JBL brand', category: 'Electronics', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'cake-stand', name: 'Cake stand', title: 'Cake Stand', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder, owner: 'Sarah', description: 'Fantastic lovely cake stand! It is so pretty and pink, I would love if you could also have it display your lovely baked cakes!' },
  { id: 'adaptor', name: 'Travel adaptor 100W with USBC port', category: 'Electronics', location: 'Toa Payoh', isFriend: false, image: placeholder },
  { id: 'tent', name: 'Camping tent, sturdy 4m x 4m', category: 'Outdoors', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'sewing-machine', name: 'Sewing machine by my grandma', category: 'Home', location: 'Clementi', isFriend: false, image: placeholder },
];

export const mapFeaturedItem: BorrowItem = {
  id: 'jacket', name: 'Denim Jacket', category: 'Clothing', location: 'Toa Payoh',
  isFriend: true, image: '/assets/denim-jacket.png',
};

export function filterItems(items: BorrowItem[], filters: BorrowFilters): BorrowItem[] {
  const prefix = filters.query.trim().toLocaleLowerCase();
  return items.filter(item =>
    item.name.toLocaleLowerCase().startsWith(prefix) &&
    (filters.category === 'all' || item.category === filters.category) &&
    (filters.location === 'all' || item.location === filters.location) &&
    (!filters.friendsOnly || item.isFriend),
  );
}

// The six listings shown across the three searched-result Figma frames.
export const cakeSearchItems: BorrowItem[] = [
  { id: 'cake-large', name: 'Cake stand 30cm by 15cm', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'cake-tiny', name: 'Tiny cake stand! only for small cakes', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder },
  sampleItems.find(item => item.id === 'cake-stand')!,
  { id: 'cake-pink', name: 'Pretty pink cake stand!', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'cake-display', name: 'Cake display case, glass', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'cake-small', name: '15cm x 15cm cake stand', category: 'Party Supplies', location: 'Clementi', isFriend: true, image: placeholder },
];

// Searchable prototype listings for items people commonly borrow.
const additionalItems: BorrowItem[] = [
  ['air-mattress', 'Air mattress', 'Outdoors'],
  ['bicycle-pump', 'Bicycle pump', 'Sports'],
  ['camera-tripod', 'Camera tripod', 'Electronics'],
  ['camping-chair', 'Camping chair', 'Outdoors'],
  ['camping-stove', 'Camping stove', 'Outdoors'],
  ['carpet-cleaner', 'Carpet cleaner', 'Home'],
  ['cooler-box', 'Cooler box', 'Outdoors'],
  ['cordless-drill', 'Cordless drill', 'Tools'],
  ['digital-camera', 'Digital camera', 'Electronics'],
  ['extension-cable', 'Extension cable', 'Electronics'],
  ['folding-chairs', 'Folding chairs', 'Party Supplies'],
  ['folding-table', 'Folding table', 'Party Supplies'],
  ['ladder', 'Ladder', 'Tools'],
  ['projector', 'Projector', 'Electronics'],
  ['pressure-washer', 'Pressure washer', 'Tools'],
  ['rice-cooker', 'Rice cooker', 'Home'],
  ['sleeping-bag', 'Sleeping bag', 'Outdoors'],
  ['socket-set', 'Socket set', 'Tools'],
  ['toolbox', 'Toolbox', 'Tools'],
  ['waffle-maker', 'Waffle maker', 'Home'],
  ['watering-can', 'Watering can', 'Home'],
  ['weighing-scale', 'Weighing scale', 'Home'],
  ['wheelbarrow', 'Wheelbarrow', 'Tools'],
  ['wireless-microphone', 'Wireless microphone', 'Electronics'],
  ['wrench-set', 'Wrench set', 'Tools'],
].map(([id, name, category], index) => ({
  id, name, category, image: placeholder,
  location: index % 2 === 0 ? 'Clementi' : 'Toa Payoh', isFriend: index % 3 !== 0,
}));

export const itemCatalog = [...sampleItems.filter(item => item.id !== 'cake-stand'), ...cakeSearchItems, ...additionalItems];
export const nearbyCakeStand: BorrowItem = {
  id: 'cake-nearby', name: 'Cake stand', category: 'Party Supplies', location: 'Toa Payoh',
  isFriend: true, image: placeholder,
};
export const allItems = [mapFeaturedItem, nearbyCakeStand, ...itemCatalog];
export const categories = [...new Set(allItems.map(item => item.category))];
export const locations = [...new Set(allItems.map(item => item.location))];

export function getBrowseItems(filters: BorrowFilters, catalog?: BorrowItem[]): BorrowItem[] {
  const isHome = !filters.query.trim() && filters.category === 'all' && filters.location === 'all' && !filters.friendsOnly;
  const source = catalog ? (isHome ? [...catalog.filter(i => !allItems.some(base => base.id === i.id)), ...catalog.filter(i => sampleItems.some(base => base.id === i.id))] : catalog) : (isHome ? sampleItems : itemCatalog);
  return filterItems(source, filters);
}

export function getSearchSuggestions(query: string, recent: string[], catalog: BorrowItem[] = itemCatalog): string[] {
  const prefix = query.trim().toLocaleLowerCase();
  const featured = ['Cake stand', 'Cordless drill', 'Folding chairs', 'Projector', 'Vacuum Cleaner model Philips', 'Waffle maker'];
  const candidates = prefix ? catalog.map(item => item.name).sort((a, b) => a.localeCompare(b)) : [...featured.filter(name => catalog.some(item => item.name === name)), ...catalog.map(item => item.name)];
  const seen = new Set<string>();
  return [...recent, ...candidates].filter(value => {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized.startsWith(prefix) || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, 6);
}
