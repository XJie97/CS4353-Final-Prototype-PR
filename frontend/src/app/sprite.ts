import { pastelFrom } from '../components/sprites/palette';
import type { PlantSpriteConfig } from '../components/sprites/types';
import type { Store } from './domain';

/** Completed loans needed before the sprout grows into a bud (more than 3). */
export const BLOOM_AT = 4;

export function completedLoans(store: Store, personId: string) {
  return store.loans.filter(l => l.status === 'complete' && (l.ownerId === personId || l.borrowerId === personId)).length;
}

/**
 * A person's plant sprite: their saved colour and face, or defaults (a pastel of
 * their profile colour and the default face) if they haven't customised it yet.
 * The topper always reflects growth: a sprout that becomes a bud after more than
 * three completed loans.
 */
export function spriteFor(store: Store, personId: string): PlantSpriteConfig & { completed: number; toBloom: number } {
  const person = store.people.find(p => p.id === personId);
  const completed = completedLoans(store, personId);
  const saved = person?.sprite;
  return {
    bodyColor: saved?.colour ?? pastelFrom(person?.colour ?? '#6750a4'),
    topper: completed >= BLOOM_AT ? 'flower' : 'sprout',
    face: saved?.headAssetId === 'face-drawn' && saved.faceStrokes?.length ? { kind: 'drawn', strokes: saved.faceStrokes } : { kind: 'default' },
    completed,
    toBloom: Math.max(0, BLOOM_AT - completed),
  };
}
