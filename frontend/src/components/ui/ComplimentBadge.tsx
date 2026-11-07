import type { ReactNode } from 'react';
import type { IconDefinition } from './icons';
import { faBoxOpen, faComment, faThumbsUp } from './icons';

function Glyph({ icon, x, y, size }: { icon: IconDefinition; x: number; y: number; size: number }) {
  const [width, height, , , path] = icon.icon;
  const scale = size / Math.max(width, height);
  return <g transform={`translate(${x - (width * scale) / 2} ${y - (height * scale) / 2}) scale(${scale})`} fill="currentColor">
    {(Array.isArray(path) ? path : [path]).map((d, i) => <path key={i} d={d} />)}
  </g>;
}

// 120x120 badge, big sticker
const ART: Record<string, ReactNode> = {
  'As described': <>
    <Glyph icon={faThumbsUp} x={60} y={36} size={34} />
    <g transform="rotate(-8 60 76)" className="badge-text">
      <text x={60} y={70} fontSize={16}>As</text>
      <text x={60} y={88} fontSize={16}>described</text>
    </g>
  </>,
  'Easy collection': <>
    <g className="badge-text">
      <text x={56} y={34} fontSize={17} transform="rotate(-7 56 34)">easy</text>
      <text x={60} y={53} fontSize={16} transform="rotate(3 60 53)">collection</text>
    </g>
    <g stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" opacity={0.55}>
      <path d="M48 66l-3-5M60 64v-6M72 66l3-5" />
    </g>
    <Glyph icon={faBoxOpen} x={60} y={85} size={46} />
  </>,
  'Great communication': <>
    <g className="badge-text">
      <text x={60} y={38} fontSize={17}>great</text>
      <text x={60} y={57} fontSize={17}>chat</text>
    </g>
    <Glyph icon={faComment} x={60} y={82} size={34} />
  </>,
};

export function ComplimentBadge({ name, colour }: { name: string; colour: string }) {
  return <svg className="compliment-badge" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <circle cx={60} cy={60} r={55} fill={colour} stroke="#fff" strokeWidth={6} />
    <g color="#2f2f2f">
      {ART[name] ?? <text className="badge-text" x={60} y={64} fontSize={14}>{name}</text>}
    </g>
  </svg>;
}
