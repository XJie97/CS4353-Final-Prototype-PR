/** What sits on top of the plant's head. */
export type SpriteTopper = "sprout" | "flower" | "none";

/** One pen stroke: points as [x, y], each 0–1 inside the sprite's face box. */
export type DrawnStroke = [number, number][];

/**
 * The face, in the same shape you can store in the database (e.g. a jsonb column).
 * Colour and stroke width are not stored: they always follow the body colour.
 */
export type SpriteFace =
  | { kind: "default" }
  | { kind: "none" }
  | { kind: "drawn"; strokes: DrawnStroke[] };

export type SpriteAnimation = "none" | "bounce" | "squish";

/** Everything needed to recreate a user's plant. Save this per user. */
export type PlantSpriteConfig = {
  bodyColor: string;
  topper: SpriteTopper;
  face: SpriteFace;
};
