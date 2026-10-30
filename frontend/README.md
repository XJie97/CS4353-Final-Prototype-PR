# Borrow frontend

React + TypeScript + Vite implementation of the Borrow home, search, filtered
results, and item-detail screens from [CS4353 PROJECT](https://www.figma.com/design/PNW1tzgY932Re3gpPiplcf/CS4353-PROJECT?node-id=27-1470).

Use Node.js 24 or newer.

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3001. The app fills the available height and remains
centered at the 402px design width on desktop. The header and navigation stay
in place while content scrolls. The filter row scrolls horizontally on narrow
screens so its controls remain usable.

## Try the flow

1. Click the search field to open the search overlay. Type `W` to see borrowable
   items such as Waffle maker and Watering can, or `Cake stand` and press Enter/Search.
2. Select **Party Supplies**, then **Clementi**. Toggle **Friends only** to
   reproduce the checked filter. Filters combine and update the map and grid.
3. Open the **Cake stand** card for Sarah's item details.
4. Use the back arrow or browser Back to return with filters and scroll position
   preserved. The Borrow tab resets the filters and returns home.
5. Search for an unmatched term to try the empty state and Clear filters.

The search overlay supports suggestions, filling a suggestion with its arrow,
clearing the draft, Enter/Search submission, and Escape/back cancellation.
Recent searches are kept in memory for the current session. Mobile devices use
their native keyboard; Figma's placement-only keyboard illustration is not
rendered. A submitted query is kept separate from the editable search draft.

Suggestions and submitted results both use case-insensitive **starts with**
matching on the full item name, ignoring surrounding spaces. For example, `W`
matches Waffle maker, Watering can, Weighing scale, Wheelbarrow, Wireless
microphone, and Wrench set; it does not match Sewing machine or Power washer.
Up to six suggestions appear, with matching recent searches first. The sample
catalog includes 25 additional borrowable items, so generated suggestions open
real prototype results instead of empty listings.

Item details use `#borrow/item/<item-id>` links, including direct links and
browser Back/Forward. The Cake Stand copy, Sarah, Clementi, and friend icon
come from the supplied detail frame. The other fixture listings show their own
names and locations without inventing owner descriptions.

The Borrow request button, notifications, chat, and other navigation tabs remain
disabled until their flows are implemented. This step does not create a loan.

```sh
npm test
npm run build
npm run preview
```

The existing root app and its Supabase integration are preserved. This app
uses fixture data and a schematic map, requires no environment variables, and
does not read or write the database. The six cake prototype listings share Party
Supplies/Clementi/friend fixture metadata. Strict prefix matching means
`Cake stand` returns the two listings whose names start with that phrase;
the nearby map preview is a separate Toa Payoh
listing. These are prototype records, not geographic distance calculations.

Assets in `public/assets/` are exported from the supplied Figma screens. No
temporary Figma URLs are used at runtime. Fonts fall back to Arial and Apple
system fonts when Inter and SF Pro are unavailable.

Browser visual verification remains outstanding: the cloud browser could not
reach the local development server in this environment.
