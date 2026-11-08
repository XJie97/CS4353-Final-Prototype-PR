import { SWATCH_HEX } from '../components/sprites/palette';
import type { PlantSpriteConfig } from '../components/sprites/types';
import { defaultSpriteColour, spriteOf, type SpriteColour, type Store } from './domain';

/** Completed loans needed before the sprout grows into a bud (more than 3). */
export const BLOOM_AT = 4;

export function completedLoans(store: Store, personId: string) {
  return store.loans.filter(l => l.status === 'complete' && (l.ownerId === personId || l.borrowerId === personId)).length;
}

/** 
 * A person's plant sprite.  Its colour is one of the named palette colours (SPRITE_COLOURS), drawn with SWATCH_HEX
 * The topper (sprout/flower) changes with number of completed loans
 */
export function spriteFor(store: Store, personId: string): PlantSpriteConfig & { colour: SpriteColour; completed: number; toBloom: number } {
  const person = store.people.find(p => p.id === personId);
  const completed = completedLoans(store, personId);
  const saved = spriteOf(person);
  return {
    //  The saved colour name, or a stable default from the person's id; drawn using its hex.
    colour: saved?.colour ?? defaultSpriteColour(personId),
    bodyColor: SWATCH_HEX[saved?.colour ?? defaultSpriteColour(personId)],
    topper: completed >= BLOOM_AT ? 'flower' : 'sprout',
    face: saved?.headAssetId === 'face-drawn' && saved.faceStrokes?.length ? { kind: 'drawn', strokes: saved.faceStrokes } : { kind: 'default' },
    completed,
    toBloom: Math.max(0, BLOOM_AT - completed),
  };
}
