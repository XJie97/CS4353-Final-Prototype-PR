import { useMemo, type CSSProperties } from 'react';
import { useApp } from '../app/context';
import type { Store } from '../app/domain';
import { Avatar } from '../components/ui/shared';
import { useOpenProfile } from './PersonProfile';

type Node = { id: string; x: number; y: number; ring: 0 | 1 | 2 };
type Edge = { a: string; b: string; kind: 'you' | 'mutual' | 'fof' };

const TAU = Math.PI * 2;
const PAD = 9; // keep nodes (and their names) inside the square, in %

function friendsOf(store: Store, id: string) {
  return store.friends.filter(f => f.status === 'accepted' && (f.from === id || f.to === id)).map(f => (f.from === id ? f.to : f.from));
}

function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * You, your friends and their friends, laid out by a small force simulation:
 * linked people pull together, everyone pushes apart, and people are nudged off
 * lines they aren't part of, so links between your friends stay visible instead
 * of running behind you. Seeded, so the same network always looks the same.
 * Exported for tests.
 */
export function buildNetwork(store: Store) {
  const me = store.activeUserId;
  const exists = (id: string) => store.people.some(p => p.id === id);
  const friends = friendsOf(store, me).filter(exists);
  const friendSet = new Set(friends);
  const edges: Edge[] = friends.map(id => ({ a: me, b: id, kind: 'you' as const }));
  const via = new Map<string, string[]>();
  for (const f of friends) {
    for (const g of friendsOf(store, f)) {
      if (g === me || !exists(g)) continue;
      if (friendSet.has(g)) { if (f < g) edges.push({ a: f, b: g, kind: 'mutual' }); continue; }
      via.set(g, [...(via.get(g) ?? []), f]);
      edges.push({ a: f, b: g, kind: 'fof' });
    }
  }
  // Friends of friends who know each other are linked too: more of the web, still faint.
  const outer = [...via.keys()];
  for (const g of outer) for (const h of friendsOf(store, g)) if (g < h && via.has(h)) edges.push({ a: g, b: h, kind: 'fof' });

  const random = seeded([me, ...friends, ...outer].join('|'));
  const nodes: Node[] = [{ id: me, x: 50, y: 50, ring: 0 }];
  friends.forEach((id, i) => {
    const a = TAU * (i / friends.length) + random() * 0.6;
    nodes.push({ id, x: 50 + 24 * Math.cos(a), y: 50 + 24 * Math.sin(a), ring: 1 });
  });
  for (const id of outer) {
    const anchor = nodes.find(n => n.id === via.get(id)![0])!;
    const a = Math.atan2(anchor.y - 50, anchor.x - 50) + (random() - 0.5) * 1.2;
    nodes.push({ id, x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a), ring: 2 });
  }
  const at = new Map(nodes.map(n => [n.id, n]));
  const radius = (n: Node) => (n.ring === 0 ? 11 : n.ring === 1 ? 8.5 : 7);
  const ideal: Record<Edge['kind'], number> = { you: 27, mutual: 24, fof: 21 };

  for (let step = 0; step < 400; step++) {
    const cool = 1 - step / 400;
    const move = new Map(nodes.map(n => [n.id, { x: 0, y: 0 }]));
    const push = (n: Node, x: number, y: number) => { const m = move.get(n.id)!; m.x += x; m.y += y; };
    // Everyone pushes apart, harder when they'd overlap.
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy);
      if (d < 0.01) { dx = random() - 0.5; dy = random() - 0.5; d = 0.5; }
      const min = radius(a) + radius(b) + 6;
      const f = 60 / (d * d) + (d < min ? (min - d) * 0.5 : 0);
      push(a, -dx / d * f, -dy / d * f); push(b, dx / d * f, dy / d * f);
    }
    // Links pull towards their ideal length.
    for (const e of edges) {
      const a = at.get(e.a)!, b = at.get(e.b)!;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
      const f = (d - ideal[e.kind]) * 0.08;
      push(a, dx / d * f, dy / d * f); push(b, -dx / d * f, -dy / d * f);
    }
    // Nobody sits on a line they aren't part of (so every link can be seen).
    for (const e of edges) {
      const a = at.get(e.a)!, b = at.get(e.b)!;
      const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy || 0.01;
      for (const n of nodes) {
        if (n.id === e.a || n.id === e.b) continue;
        const t = Math.max(0, Math.min(1, ((n.x - a.x) * vx + (n.y - a.y) * vy) / len2));
        const px = a.x + t * vx, py = a.y + t * vy;
        let dx = n.x - px, dy = n.y - py; const d = Math.hypot(dx, dy);
        const clear = radius(n) + 3;
        if (d >= clear) continue;
        if (d < 0.01) { dx = -vy; dy = vx; } // straight on the line: step off sideways
        const k = Math.hypot(dx, dy), f = (clear - d) * 0.35;
        push(n, dx / k * f, dy / k * f);
        push(a, -dx / k * f * 0.25, -dy / k * f * 0.25); push(b, -dx / k * f * 0.25, -dy / k * f * 0.25);
      }
    }
    // Friends of friends drift outward a little, so the middle stays readable.
    for (const n of nodes) if (n.ring === 2) { const dx = n.x - 50, dy = n.y - 50, d = Math.hypot(dx, dy) || 1; push(n, dx / d * 0.6, dy / d * 0.6); }
    for (const n of nodes) {
      if (n.id === me) continue; // you stay in the centre
      const m = move.get(n.id)!; const len = Math.hypot(m.x, m.y); const cap = 3 * cool + 0.2;
      const s2 = len > cap ? cap / len : 1;
      n.x = Math.min(100 - PAD, Math.max(PAD, n.x + m.x * s2));
      n.y = Math.min(100 - PAD, Math.max(PAD, n.y + m.y * s2));
    }
  }

  // Fill the square: centre the drawing and scale it up to the padding.
  if (nodes.length > 1) {
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min((100 - 2 * PAD) / Math.max(x1 - x0, 1), (100 - 2 * PAD) / Math.max(y1 - y0, 1), 1.6);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (const n of nodes) { n.x = 50 + (n.x - cx) * k; n.y = 50 + (n.y - cy) * k; }
  }

  return { nodes, edges, suggestions: outer.map(id => ({ id, mutual: via.get(id)! })).sort((p, q) => q.mutual.length - p.mutual.length) };
}

export function FriendNetwork() {
  const { store } = useApp();
  const openProfile = useOpenProfile();
  const { nodes, edges, suggestions } = useMemo(() => buildNetwork(store), [store]);
  const at = new Map(nodes.map(n => [n.id, n]));
  const name = (id: string) => store.people.find(p => p.id === id)?.name ?? '';

  return <section className="friend-network">
    <p className="muted friend-network__intro">Your network of friends, and their friends. Tap anyone to see their profile.</p>
    <div className="friend-network__graph">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {/* Draw faint lines first so the solid ones sit on top. */}
        {[...edges].sort((p, q) => Number(p.kind !== 'fof') - Number(q.kind !== 'fof')).map(e => {
          const a = at.get(e.a), b = at.get(e.b);
          if (!a || !b) return null;
          return <line key={`${e.a}-${e.b}`} className={`net-line net-line--${e.kind}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </svg>
      {nodes.map((n, i) => {
        const person = store.people.find(p => p.id === n.id);
        if (!person) return null;
        const size = n.ring === 0 ? 64 : n.ring === 1 ? 46 : 36;
        return <button key={n.id} type="button" className={`net-node net-node--ring${n.ring}`}
          style={{ left: `${n.x}%`, top: `${n.y}%`, '--node-delay': `${n.ring * 220 + i * 40}ms` } as CSSProperties}
          aria-label={n.ring === 0 ? `You, ${person.name}` : `${person.name}${n.ring === 2 ? ', friend of a friend' : ', friend'}. View profile`}
          onClick={() => openProfile?.(n.id)}>
          <Avatar person={person} size={size} />
          <span className="net-node__name">{n.ring === 0 ? person.name : person.name.split(' ')[0]}</span>
          {n.ring === 0 && <span className="net-node__you">You</span>}
        </button>;
      })}
      {nodes.length === 1 && <p className="friend-network__empty">Add a friend to start your network.</p>}
    </div>
    <ul className="friend-network__legend" aria-label="Legend">
      <li><svg width="28" height="8" aria-hidden="true"><line className="net-line net-line--you" x1="1" y1="4" x2="27" y2="4" /></svg>You're friends</li>
      <li><svg width="28" height="8" aria-hidden="true"><line className="net-line net-line--mutual" x1="1" y1="4" x2="27" y2="4" /></svg>Your friends know each other</li>
      <li><svg width="28" height="8" aria-hidden="true"><line className="net-line net-line--fof" x1="1" y1="4" x2="27" y2="4" /></svg>Friend of a friend</li>
    </ul>
    {suggestions.length > 0 && <>
      <h2>People you may know</h2>
      <ul className="friend-network__suggestions">
        {suggestions.map(s => {
          const person = store.people.find(p => p.id === s.id)!;
          return <li key={s.id}>
            <button type="button" onClick={() => openProfile?.(s.id)}>
              <Avatar person={person} size={40} />
              <span><strong>{person.name}</strong><small>Friends with {s.mutual.map(name).join(', ')}</small></span>
            </button>
          </li>;
        })}
      </ul>
    </>}
  </section>;
}
