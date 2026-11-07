import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useApp } from '../app/context';
import { spriteFor } from '../app/sprite';
import { dateLabel, type Person } from '../app/domain';
import type { HelpRequest } from '../app/help';
import { PlantSprite, TvSprite } from '../components/sprites';
import { Modal } from '../components/ui/shared';
import { UserChip } from '../components/ui/UserChip';
import { useOpenProfile } from './PersonProfile';
import { currentLoan } from './ShelfStrip';

const ISLAND = { w: 880, h: 477 };
const HEADROOM = 100;
const STAGE_H = ISLAND.h + HEADROOM;
const VISIBLE_H = HEADROOM + 410;
const SPRITE_H = 230;
const SPRITE_W = SPRITE_H * (579 / 974);
const TV_H = 60;
const TV_W = TV_H * (706 / 606);
const TV_GAP = 80;
const BUBBLE_SHOW_MS = 8000;
const BUBBLE_FADE_MS = 600;
const BUBBLE_GAP_MS = 1200;

export const SPOTS: [number, number][] = [
  [165, 170], // back left
  [470, 118], // back middle
  [740, 228], // right
  [320, 325], // front left
  [590, 340], // front right
];
export const MAX_ON_ISLAND = SPOTS.length;
const GROUND = { cx: 440, cy: 208, rx: 438, ry: 206 };

// True when a point is on the top of the island (with a margin from the edge)
export function onGround(x: number, y: number, margin = 0.92) {
  return ((x - GROUND.cx) / GROUND.rx) ** 2 + ((y - GROUND.cy) / GROUND.ry) ** 2 <= margin;
}

// Small seeded random generator, so the same friends always get the same layout
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(n: number, from = 0, picked: number[] = [], out: number[][] = []) {
  if (picked.length === n) { out.push(picked); return out; }
  for (let i = from; i <= SPOTS.length - (n - picked.length); i++) choose(n, i + 1, [...picked, i], out);
  return out;
}

// How well a set of spots spreads out: far apart from each other, and centred on the island
function spread(spots: number[]) {
  let nearest = 1000;
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
    const [x1, y1] = SPOTS[spots[i]], [x2, y2] = SPOTS[spots[j]];
    nearest = Math.min(nearest, Math.hypot(x1 - x2, (y1 - y2) * 1.6));
  }
  const cx = spots.reduce((s, i) => s + SPOTS[i][0], 0) / spots.length;
  const cy = spots.reduce((s, i) => s + SPOTS[i][1], 0) / spots.length;
  return (spots.length > 1 ? nearest : 0) - Math.hypot(cx - GROUND.cx, (cy - 250) * 1.6) * 0.8;
}

/** Places friends on the fixed spots. With fewer than five, it picks one of the
 * best-spread sets of spots, and who stands where is shuffled, both seeded by
 * who's there, so it looks random but stays put. Exported for tests.
 */
export function scatter(ids: string[]) {
  const random = seeded([...ids].sort().join('|'));
  const options = choose(ids.length).map(spots => ({ spots, score: spread(spots) })).sort((a, b) => b.score - a.score);
  const top = options.slice(0, Math.min(3, options.length));
  const spots = [...top[Math.floor(random() * top.length)].spots];
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return ids.map((id, i) => ({
    id,
    x: SPOTS[spots[i]][0] + (random() - 0.5) * 16,
    y: SPOTS[spots[i]][1] + (random() - 0.5) * 10,
    tvDrop: [random() * 22, random() * 22] as const,
  }));
}

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/** 
 * Pinned under the friends list: your friends standing on the island, each with
 * up to two TVs (in their colour) showing things they can lend right now. Friends
 * who've asked for help sway, and take turns "thinking" about what they need.
 */
export function FriendshipIsland({ friends, onItem, onHelp }: { friends: Person[]; onItem?: (id: string) => void; onHelp?: () => void }) {
  const { store } = useApp();
  const openProfile = useOpenProfile();
  const [viewing, setViewing] = useState<HelpRequest | null>(null);

  const requestOf = useMemo(() => {
    const map = new Map<string, HelpRequest>();
    for (const r of store.helpRequests ?? []) if (r.status === 'open' && !map.has(r.borrowerId)) map.set(r.borrowerId, r);
    return map;
  }, [store.helpRequests]);

  // Friends with a request go first so they're always on the island.
  const ordered = [...friends].sort((a, b) => Number(requestOf.has(b.id)) - Number(requestOf.has(a.id)));
  const shown = ordered.slice(0, MAX_ON_ISLAND);
  const extra = friends.length - shown.length;
  const key = shown.map(p => p.id).join('|');
  const spots = useMemo(() => scatter(shown.map(p => p.id)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const placed = spots.map((spot, order) => ({ ...spot, order, person: shown.find(p => p.id === spot.id)! }))
    .sort((a, b) => a.y - b.y); // back first, so front sprites overlap them

  const thinkers = shown.filter(p => requestOf.has(p.id)).map(p => p.id);
  const thinking = useThoughtTurns(thinkers);

  return <section className="friendship-island" aria-label={`Friendship island: ${friends.length ? `${friends.length} friend${friends.length === 1 ? '' : 's'}` : 'no friends yet'}`}>
    <div className="friendship-island__frame" style={{ aspectRatio: `${ISLAND.w} / ${VISIBLE_H}` }}>
    <div className="friendship-island__stage" style={{ aspectRatio: `${ISLAND.w} / ${STAGE_H}` }}>
      <img className="friendship-island__ground" src="/assets/friendship-island.svg" alt="" style={{ top: pct(HEADROOM, STAGE_H) }} />
      {placed.map(({ person, order, x, y, tvDrop }) => {
        const sprite = spriteFor(store, person.id);
        const request = requestOf.get(person.id);
        const available = store.items.filter(i => i.ownerId === person.id && i.listed && !currentLoan(i, store.loans)).slice(0, 2);
        const timing = { '--enter-delay': `${order * 140}ms`, '--idle-delay': `${-order * 1.3}s` } as CSSProperties;
        return <div key={person.id} className="island-group" style={timing}>
          <button type="button" className={`island-friend${request ? ' island-friend--looking' : ''}`}
            aria-label={`${person.name}${request ? `, looking for ${request.title}` : ''}. View profile`} onClick={() => openProfile?.(person.id)}
            style={{ left: pct(x - SPRITE_W / 2, ISLAND.w), top: pct(y + HEADROOM - SPRITE_H, STAGE_H), width: pct(SPRITE_W, ISLAND.w), zIndex: Math.round(y) }}>
            <span className="island-friend__body">
              <PlantSprite bodyColor={sprite.bodyColor} topper={sprite.topper} face={sprite.face} label="" />
            </span>
          </button>
          {available.map((item, side) => {
            const cx = x + (side === 0 ? -TV_GAP : TV_GAP);
            const feet = y + 4 + tvDrop[side];
            return <button key={item.id} type="button" className="island-tv" title={item.name}
              aria-label={`${item.name}, available from ${person.name}`} onClick={() => onItem?.(item.id)}
              style={{
                left: pct(cx - TV_W / 2, ISLAND.w), top: pct(feet + HEADROOM - TV_H, STAGE_H), width: pct(TV_W, ISLAND.w), zIndex: Math.round(feet),
                '--tv-delay': `${order * 140 + 260 + side * 90}ms`, '--tv-idle': `${-(order * 0.9 + side * 1.7)}s`,
              } as CSSProperties}>
              <span className="island-tv__body"><TvSprite image={item.image} imageAlt="" bodyColor={sprite.bodyColor} /></span>
            </button>;
          })}
          {request && <button type="button" className={`thought-bubble${thinking === person.id ? ' thought-bubble--on' : ''}`}
            aria-hidden={thinking !== person.id} tabIndex={thinking === person.id ? 0 : -1}
            aria-label={`${person.name} is looking for ${request.title}. View request`}
            onClick={() => setViewing(request)}
            style={{ left: pct(Math.min(Math.max(x, 110), ISLAND.w - 110), ISLAND.w), bottom: pct(STAGE_H - (y + HEADROOM - SPRITE_H - 14), STAGE_H) }}>
            <span className={`thought-bubble__text${request.title.length > 18 ? ' thought-bubble__text--long' : request.title.length > 12 ? ' thought-bubble__text--mid' : ''}`}>{request.title}</span>
          </button>}
        </div>;
      })}
      {!friends.length && <p className="friendship-island__empty">Your island is waiting for friends</p>}
    </div>
    {extra > 0 && <span className="friendship-island__more">+{extra} more</span>}
    </div>

    {viewing && <RequestSheet request={viewing} onClose={() => setViewing(null)} onHelp={onHelp ? () => { setViewing(null); onHelp(); } : undefined} />}
  </section>;
}

/** Cycles through the friends who've asked for help: one bubble at a time, ~8s each. */
function useThoughtTurns(ids: string[]) {
  const key = ids.join('|');
  const [turn, setTurn] = useState({ index: 0, on: false });
  useEffect(() => {
    if (!ids.length) return;
    let index = 0;
    let timer: number;
    const show = () => { setTurn({ index, on: true }); timer = window.setTimeout(hide, BUBBLE_SHOW_MS + BUBBLE_FADE_MS); };
    const hide = () => { setTurn({ index, on: false }); timer = window.setTimeout(() => { index = (index + 1) % ids.length; show(); }, BUBBLE_FADE_MS + BUBBLE_GAP_MS); };
    timer = window.setTimeout(show, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return turn.on ? ids[turn.index % Math.max(ids.length, 1)] : undefined;
}

/** A friend's help request, opened from their thought bubble. */
function RequestSheet({ request, onClose, onHelp }: { request: HelpRequest; onClose: () => void; onHelp?: () => void }) {
  const { store } = useApp();
  const person = store.people.find(p => p.id === request.borrowerId);
  return <Modal title={`Looking for ${request.title}`} className="bottom-sheet request-sheet" onClose={onClose}>
    <UserChip person={person} isFriend size={36} detail="is asking for help" />
    {request.description && <p className="request-sheet__text">{request.description}</p>}
    <p className="request-sheet__dates"><strong>Needed</strong> {request.start === request.end ? dateLabel(request.start) : `${dateLabel(request.start)} – ${dateLabel(request.end)}`}</p>
    <div className="form-actions">
      <button className="button" type="button" onClick={onClose}>Not now</button>
      {onHelp && <button className="button primary" type="button" onClick={onHelp}>Offer an item</button>}
    </div>
  </Modal>;
}
