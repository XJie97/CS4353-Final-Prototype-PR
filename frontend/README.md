# Borrow frontend

Standalone React + TypeScript + Vite implementation of **Borrow Page / Home**
from [CS4353 PROJECT](https://www.figma.com/design/PNW1tzgY932Re3gpPiplcf/CS4353-PROJECT?node-id=27-1470).

Use Node.js 24 or newer.

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:3001. The app matches the 402px mobile design and fills the
available height; on a desktop it stays centered at the design width. The header
and bottom navigation stay in place while the map and item grid scroll.

```sh
npm test
npm run build
npm run preview
```

Search, category, location, friends-only filtering, marker selection, item-to-map
selection, and empty-state reset work locally. Sample items reproduce the design;
the map is a schematic, not a geographic map or distance calculation. Notifications,
chat, and the other navigation tabs are disabled until their screens are added.
Item cards currently select an item on the map; the item-details screen is a later step.

The existing app in the repository root and its Supabase integration are preserved.
This separate app does not require environment variables or write to the database.
`src/pages/borrow/items.ts` holds the typed fixture data for later replacement with
real data. Assets in `public/assets/` are exported from this Figma screen; no
temporary Figma asset URLs are used at runtime. The original design uses Inter
and SF Pro; system Arial and Apple system fonts are fallbacks when unavailable.

## Draft status

The exported Figma assets are included. Browser visual verification is still
outstanding because the cloud browser could not reach the local development server.
