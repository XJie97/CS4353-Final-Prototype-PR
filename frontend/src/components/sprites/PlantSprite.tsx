import { useId, useMemo, type CSSProperties } from "react";
import { deriveSpritePalette } from "./palette";
import type { DrawnStroke, SpriteAnimation, SpriteFace, SpriteTopper } from "./types";
import "./sprites.css";

/**
 * The plant character from Figma (node 2018:3997 and friends).
 *
 * Every part reads its colour from three CSS variables, so a single
 * `bodyColor` recolours the whole sprite, including a drawn face.
 */
export type PlantSpriteProps = {
  /** The one colour the user picks. Mid and outline shades are derived from it. */
  bodyColor?: string;
  topper?: SpriteTopper;
  face?: SpriteFace;
  /** Rendered width in px. Leave out to fill the parent's width. */
  size?: number;
  animation?: SpriteAnimation;
  /** Read by screen readers. Pass "" to hide a purely decorative sprite. */
  label?: string;
  className?: string;
  /** "head" frames just the head as a square (used by the face drawing pad). */
  crop?: "full" | "head";
};

// Artwork coordinates (from Figma, in the body's 579 × 874 export space).
// The viewBox extends 100 units above the head so the flower fits.
const VIEW_BOX = "0 -100 579 974";
/** Square around the head, shared with the drawing pad so coordinates line up. */
export const HEAD_VIEW_BOX = "74 -12 430 430";
const ASPECT = 974 / 579;

const FACE_OFFSET = { x: 214, y: 149 };
const SPROUT_OFFSET = { x: 212, y: -49 };
const FLOWER_OFFSET = { x: 216, y: -100 };

/** Head circle, used to clip drawn faces so strokes never leave the head. */
const HEAD = { cx: 289.5, cy: 198.7, r: 195.5 };

/**
 * The box a drawn face is mapped into. Drawn points are stored as 0–1
 * coordinates inside this box, so a drawing pad of any size can produce them.
 */
export const FACE_BOX = { x: 140, y: 70, w: 300, h: 260 };

const STROKE = 6; // matches the Figma outline weight

export function PlantSprite({
  bodyColor = "#F7C8FF",
  topper = "sprout",
  face = { kind: "default" },
  size,
  animation = "none",
  label = "Plant character",
  className,
  crop = "full",
}: PlantSpriteProps) {
  const clipId = useId();
  const palette = useMemo(() => deriveSpritePalette(bodyColor), [bodyColor]);

  const style = {
    "--sprite-body": palette.body,
    "--sprite-mid": palette.mid,
    "--sprite-outline": palette.outline,
    ...(size ? { width: size, height: crop === "head" ? size : size * ASPECT } : { width: "100%", aspectRatio: crop === "head" ? "1" : "579 / 974" }),
  } as unknown as CSSProperties;

  return (
    <span
      className={["sprite", `sprite--${animation}`, crop === "head" && "sprite--head", className].filter(Boolean).join(" ")}
      style={style}
    >
      {/* The shadow stays on the ground while the figure above it moves */}
      <span className="sprite__shadow" aria-hidden="true" />
      <span className="sprite__figure">
      <svg
        viewBox={crop === "head" ? HEAD_VIEW_BOX : VIEW_BOX}
        width="100%"
        height="100%"
        role={label ? "img" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} />
          </clipPath>
        </defs>

        <Body />

        {face.kind === "default" && (
          <g transform={`translate(${FACE_OFFSET.x} ${FACE_OFFSET.y})`}>
            <DefaultFace />
          </g>
        )}
        {face.kind === "drawn" && (
          <g clipPath={`url(#${clipId})`}>
            <DrawnFace strokes={face.strokes} />
          </g>
        )}

        {topper === "sprout" && (
          <g transform={`translate(${SPROUT_OFFSET.x} ${SPROUT_OFFSET.y})`}>
            {/* Inner group so the CSS sway doesn't override the position */}
            <g className="sprite__topper">
              <Sprout />
            </g>
          </g>
        )}
        {topper === "flower" && (
          <g transform={`translate(${FLOWER_OFFSET.x} ${FLOWER_OFFSET.y})`}>
            {/* Inner group so the CSS sway doesn't override the position */}
            <g className="sprite__topper">
              <Flower />
            </g>
          </g>
        )}
      </svg>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Parts (paths copied from the Figma export; colours swapped for variables)
// ---------------------------------------------------------------------------

const BODY_FILL =
  "M295 632.32C293.509 632.32 292.067 632.393 290.674 632.54C290.279 632.582 289.888 632.63 289.5 632.684C314.897 636.22 323.549 666.179 323.549 745.779V845.057C323.549 854.372 323.43 863.007 323.18 871H464.444C464.444 849.899 457.022 829.663 443.811 814.743C436.244 806.198 427.134 799.797 417.221 795.887C416.286 795.519 415.344 795.172 414.395 794.848L381.742 481.976L381.481 479.476L466.676 572.902C468.498 597.951 492.249 617.773 521.281 617.773C551.502 617.773 576 596.296 576 569.802C576 543.309 551.502 521.832 521.281 521.832C514.279 521.832 507.583 522.986 501.429 525.087C500.241 525.493 499.073 525.934 497.927 526.409C360.726 351.983 356.382 385.981 347.211 373.982C463.237 365.046 484.835 277.091 484.835 198.722C484.835 90.9988 397.483 3.60153 289.5 3.00309C181.517 3.60153 94.1652 90.9988 94.1652 198.722C94.1652 277.091 115.763 365.046 231.789 373.982C222.618 385.981 218.274 351.983 81.0731 526.409C79.9271 525.934 78.7594 525.493 77.5714 525.087C71.4168 522.986 64.7215 521.832 57.7186 521.832C27.4984 521.832 3 543.309 3 569.802C3 596.296 27.4984 617.773 57.7186 617.773C86.7512 617.773 110.502 597.951 112.324 572.902L197.519 479.476L197.258 481.976L164.605 794.848C163.656 795.172 162.714 795.519 161.779 795.887C151.866 799.797 142.756 806.198 135.189 814.743C121.978 829.663 114.556 849.899 114.556 871H255.82C255.57 863.007 255.451 854.372 255.451 845.057V745.779C255.451 666.179 264.103 636.22 289.5 632.684C289.112 632.63 288.721 632.582 288.326 632.54C286.933 632.393 285.491 632.32 284 632.32H286.349H292.651H295Z";

const BODY_OUTLINE =
  "M292.651 632.32H295C293.509 632.321 292.067 632.393 290.674 632.54M295 632.32H286.349M290.674 632.54C289.282 632.393 287.84 632.321 286.349 632.32M290.674 632.54C290.279 632.582 289.888 632.63 289.5 632.684M286.349 632.32H284M286.349 632.32H292.651M161.779 795.887C162.714 795.519 163.656 795.172 164.605 794.848L197.519 479.476L112.324 572.902C110.502 597.951 86.7512 617.773 57.7186 617.773C27.4984 617.773 3 596.296 3 569.802C3 543.309 27.4984 521.832 57.7186 521.832C64.7215 521.832 71.4168 522.986 77.5714 525.087M197.519 479.476L197.258 481.976L164.605 794.848M290.616 3C290.244 3 289.872 3.00103 289.5 3.00309M197.258 481.976C198.967 474.977 202.346 464.477 203.794 461.977M158.905 796.961C159.902 796.567 160.858 796.21 161.779 795.887M182.556 793.46C175.716 792.817 170.223 792.928 161.779 795.887M77.3322 524.974C77.4121 525.012 77.4918 525.049 77.5714 525.087M88.9165 534.474C87.4902 531.026 82.7861 527.579 77.5714 525.087M292.651 632.32H284C285.491 632.321 286.933 632.393 288.326 632.54M288.326 632.54C289.718 632.393 291.16 632.321 292.651 632.32M288.326 632.54C288.721 632.582 289.112 632.63 289.5 632.684M414.395 794.848L381.481 479.476M381.742 481.976L414.395 794.848C415.344 795.172 416.286 795.519 417.221 795.887M381.742 481.976L381.481 479.476L466.676 572.902C468.498 597.951 492.249 617.773 521.281 617.773C551.502 617.773 576 596.296 576 569.802C576 543.309 551.502 521.832 521.281 521.832C514.279 521.832 507.583 522.986 501.429 525.087M288.384 3C288.756 3 289.128 3.00103 289.5 3.00309M381.742 481.976C380.033 474.977 376.654 464.477 375.206 461.977M420.095 796.961C419.098 796.567 418.142 796.21 417.221 795.887M396.444 793.46C403.284 792.817 408.777 792.928 417.221 795.887M501.668 524.974C501.588 525.012 501.508 525.049 501.429 525.087M490.084 534.474C491.51 531.026 496.214 527.579 501.429 525.087M289.5 632.684C314.897 636.22 323.549 666.179 323.549 745.779V845.057C323.549 854.372 323.43 863.007 323.18 871H464.444C464.444 849.899 457.022 829.663 443.811 814.743C436.244 806.198 427.134 799.797 417.221 795.887M289.5 632.684C264.103 636.22 255.451 666.179 255.451 745.779V845.057C255.451 854.372 255.57 863.007 255.82 871H114.556C114.556 849.899 121.978 829.663 135.189 814.743C142.756 806.198 151.866 799.797 161.779 795.887M501.429 525.087C500.241 525.493 499.073 525.934 497.927 526.409C360.726 351.983 356.382 385.981 347.211 373.982C463.237 365.046 484.835 277.091 484.835 198.722C484.835 90.9988 397.483 3.60153 289.5 3.00309M289.5 3.00309C181.517 3.60153 94.1652 90.9988 94.1652 198.722C94.1652 277.091 115.763 365.046 231.789 373.982C222.618 385.981 218.274 351.983 81.0731 526.409C79.9271 525.934 78.7594 525.493 77.5714 525.087";

function Body() {
  return (
    <g>
      <path d={BODY_FILL} fill="var(--sprite-body)" />
      <path
        d={BODY_OUTLINE}
        fill="none"
        stroke="var(--sprite-outline)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </g>
  );
}

function DefaultFace() {
  return (
    <g>
      <ellipse cx="16.4429" cy="23.9937" rx="16.4429" ry="23.9936" fill="var(--sprite-outline)" />
      <ellipse cx="136.433" cy="23.9936" rx="16.4429" ry="23.9936" fill="var(--sprite-outline)" />
      <path
        d="M21.0537 97.4928C37.4882 132.12 85.1311 144.495 116.339 122.243"
        fill="none"
        stroke="var(--sprite-outline)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <ellipse
        cx="77.3875"
        cy="61.1508"
        rx="19.1834"
        ry="12.7966"
        fill="none"
        stroke="var(--sprite-outline)"
        strokeWidth={STROKE}
      />
    </g>
  );
}

function Sprout() {
  return (
    <path
      d="M77.1742 56.9997C82.1709 39.5723 81.0306 39.22 64.4498 26.3153M64.4498 26.3153C41.425 17.1829 24.1063 13.7104 6.56577 30.148M64.4498 26.3153C82.0186 -12.9328 124.241 17.2225 118.834 14.7275M6.00098 30.4326C24.6481 40.8067 36.7798 41.3004 63.0126 27.6066C96.9389 34.8772 109.688 24.0053 119.325 15.6978"
      fill="none"
      stroke="var(--sprite-mid)"
      strokeWidth={12}
      strokeLinecap="round"
    />
  );
}

function Flower() {
  const petal = { fill: "var(--sprite-mid)" };
  return (
    <g>
      <ellipse {...petal} cx="15.0157" cy="23.7531" rx="15.0157" ry="23.7531" transform="matrix(0.801156 0.598456 -0.703725 0.710473 48.0791 43.4603)" />
      <ellipse {...petal} cx="13.8006" cy="25.6043" rx="13.8006" ry="25.6043" transform="matrix(-0.10976 0.993958 -0.99655 -0.0829916 54.0615 33.9302)" />
      <ellipse {...petal} cx="15.8642" cy="22.2675" rx="15.8642" ry="22.2675" transform="matrix(-0.999244 0.0388755 -0.051519 -0.998672 71.8384 44.4759)" />
      <ellipse {...petal} cx="14.4032" cy="24.7232" rx="14.4032" ry="24.7232" transform="matrix(-0.586748 -0.809769 0.877528 -0.479525 70.6099 62.9373)" />
      <ellipse {...petal} cx="14.1123" cy="25.1571" rx="14.1123" ry="25.1571" transform="matrix(0.434988 -0.900436 0.939587 0.342311 53.7075 68.8748)" />
      <path
        d="M78.7304 115.54C78.7304 78.9706 65.3035 53.5305 54.9282 57.2406"
        fill="none"
        stroke="var(--sprite-mid)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <ellipse cx="54.3179" cy="49.8205" rx="21.3609" ry="19.0802" fill="var(--sprite-body)" />
    </g>
  );
}

function DrawnFace({ strokes }: { strokes: DrawnStroke[] }) {
  return (
    <g fill="none" stroke="var(--sprite-outline)" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {strokes.map((stroke, i) => (
        <path key={i} d={strokeToPath(stroke)} />
      ))}
    </g>
  );
}

/** Maps normalised 0–1 points into the face box and smooths them into a path. */
export function strokeToPath(stroke: DrawnStroke): string {
  const pts = stroke.map(([x, y]) => [FACE_BOX.x + x * FACE_BOX.w, FACE_BOX.y + y * FACE_BOX.h]);
  if (pts.length === 0) return "";
  const r = (n: number) => Math.round(n * 10) / 10;
  if (pts.length === 1) {
    // A single tap becomes a dot.
    const [x, y] = pts[0];
    return `M${r(x)} ${r(y)}l0.01 0`;
  }
  // Quadratic curves through midpoints give smooth lines from sparse points.
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += `Q${r(x)} ${r(y)} ${r((x + nx) / 2)} ${r((y + ny) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return d + `L${r(lx)} ${r(ly)}`;
}

/**
 * Just the sprout or flower, framed for a close-up (e.g. a growth badge).
 * Uses the same colours as the full sprite.
 */
export function PlantTopper({ bodyColor = "#F7C8FF", topper, size = 64, className }: { bodyColor?: string; topper: "sprout" | "flower"; size?: number; className?: string }) {
  const palette = useMemo(() => deriveSpritePalette(bodyColor), [bodyColor]);
  const style = { "--sprite-body": palette.body, "--sprite-mid": palette.mid, "--sprite-outline": palette.outline, width: size, height: size } as CSSProperties;
  // Square frames around each part's artwork, with a little breathing room.
  const viewBox = topper === "sprout" ? "-17 -44 160 160" : "-23 -19 160 160";
  return (
    <span className={["sprite-topper", className].filter(Boolean).join(" ")} style={style}>
      <svg viewBox={viewBox} width="100%" height="100%" aria-hidden="true">
        {topper === "sprout" ? <Sprout /> : <Flower />}
      </svg>
    </span>
  );
}
