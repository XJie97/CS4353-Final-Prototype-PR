export type BorrowItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  isFriend: boolean;
  image: string;
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
  { id: 'cake-stand', name: 'Cake stand', category: 'Kitchen', location: 'Toa Payoh', isFriend: true, image: placeholder },
  { id: 'adaptor', name: 'Travel adaptor 100W with USBC port', category: 'Electronics', location: 'Toa Payoh', isFriend: false, image: placeholder },
  { id: 'tent', name: 'Camping tent, sturdy 4m x 4m', category: 'Outdoors', location: 'Clementi', isFriend: true, image: placeholder },
  { id: 'sewing-machine', name: 'Sewing machine by my grandma', category: 'Home', location: 'Clementi', isFriend: false, image: placeholder },
];

export const mapFeaturedItem: BorrowItem = {
  id: 'jacket', name: 'Denim Jacket', category: 'Clothing', location: 'Toa Payoh',
  isFriend: true, image: '/assets/denim-jacket.png',
};

export function filterItems(items: BorrowItem[], filters: BorrowFilters): BorrowItem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter(item =>
    item.name.toLocaleLowerCase().includes(query) &&
    (filters.category === 'all' || item.category === filters.category) &&
    (filters.location === 'all' || item.location === filters.location) &&
    (!filters.friendsOnly || item.isFriend),
  );
}
