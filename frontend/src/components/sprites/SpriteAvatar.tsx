import { useMemo, type CSSProperties } from "react";
import { deriveSpritePalette } from "./palette";
import { DefaultFace, DrawnFace, FACE_OFFSET } from "./PlantSprite";
import type { SpriteFace } from "./types";

const VIEW = { x: 140, y: 55, size: 300 };

export function SpriteAvatar({ bodyColor, face, size = 36, label, className }: { bodyColor: string; face: SpriteFace; size?: number; label?: string; className?: string }) {
  const palette = useMemo(() => deriveSpritePalette(bodyColor), [bodyColor]);
  const stroke = Math.max(6, (1.6 * VIEW.size) / size);
  const style = {
    "--sprite-body": palette.body,
    "--sprite-outline": palette.outline,
    width: size,
    height: size,
    borderWidth: Math.max(1.5, size / 28),
  } as CSSProperties;
  return (
    <span className={["avatar", "sprite-avatar", className].filter(Boolean).join(" ")} style={style}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}`} width="100%" height="100%" aria-hidden="true">
        {face.kind === "default" && <g transform={`translate(${FACE_OFFSET.x} ${FACE_OFFSET.y})`}><DefaultFace stroke={stroke} /></g>}
        {face.kind === "drawn" && <DrawnFace strokes={face.strokes} stroke={stroke} />}
      </svg>
    </span>
  );
}
