import { useRef, useState, type PointerEvent } from 'react';
import { FACE_BOX, HEAD_VIEW_BOX, PlantSprite } from '../components/sprites';
import type { DrawnStroke, SpriteTopper } from '../components/sprites/types';
import { SPRITE_LIMITS } from '../app/domain';

const MIN_STEP = 0.012; // skip points closer than this (in face-box units) to keep saved data small
const round = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number) => Math.min(SPRITE_LIMITS.max, Math.max(SPRITE_LIMITS.min, n));

/**
 * Draw on the sprite's head with one colour and one stroke width (both follow the body
 * colour, so the face recolours later). Points are stored as 0–1 coordinates in FACE_BOX.
 */
export function FaceDrawingPad({ bodyColor, topper, strokes, onChange }: { bodyColor: string; topper: SpriteTopper; strokes: DrawnStroke[]; onChange: (strokes: DrawnStroke[]) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [current, setCurrent] = useState<DrawnStroke | null>(null);
  const full = strokes.length >= SPRITE_LIMITS.strokes;

  function toFace(e: PointerEvent<SVGSVGElement>): [number, number] | null {
    const el = svg.current; const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [round(clamp((pt.x - FACE_BOX.x) / FACE_BOX.w)), round(clamp((pt.y - FACE_BOX.y) / FACE_BOX.h))];
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (full) return;
    const p = toFace(e); if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCurrent([p]);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!current) return;
    const p = toFace(e); if (!p) return;
    const last = current[current.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_STEP || current.length >= SPRITE_LIMITS.points) return;
    setCurrent([...current, p]);
  }
  function up() {
    if (current) onChange([...strokes, current]);
    setCurrent(null);
  }

  const shown = current ? [...strokes, current] : strokes;
  return <div className="face-pad">
    <div className="face-pad__canvas">
      <PlantSprite crop="head" bodyColor={bodyColor} topper={topper} face={shown.length ? { kind: 'drawn', strokes: shown } : { kind: 'none' }} label="" />
      <svg ref={svg} className="face-pad__input" viewBox={HEAD_VIEW_BOX} role="img" aria-label="Drawing area: draw a face on the head"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {!shown.length && <rect x={FACE_BOX.x} y={FACE_BOX.y} width={FACE_BOX.w} height={FACE_BOX.h} rx="24" className="face-pad__guide" />}
      </svg>
    </div>
    <div className="face-pad__tools">
      <button type="button" className="button" disabled={!strokes.length} onClick={() => onChange(strokes.slice(0, -1))}>Undo</button>
      <button type="button" className="button" disabled={!strokes.length} onClick={() => onChange([])}>Clear</button>
    </div>
    {full && <p className="muted">That's the most strokes a face can have. Undo or clear to keep drawing.</p>}
  </div>;
}
