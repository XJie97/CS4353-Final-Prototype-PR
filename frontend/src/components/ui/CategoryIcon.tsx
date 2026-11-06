import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { categoryIcon } from '../../app/categories';

/** Renders a Font Awesome icon definition as inline SVG in the current text colour. */
export function FaIcon({ icon, size = 20, className, title }: { icon: IconDefinition; size?: number; className?: string; title?: string }) {
  const [width, height, , , path] = icon.icon;
  return <svg className={className} width={size} height={size} viewBox={`0 0 ${width} ${height}`} fill="currentColor"
    role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
    {(Array.isArray(path) ? path : [path]).map((d, i) => <path key={i} d={d} />)}
  </svg>;
}

/** The icon for an item category (see app/categories.ts). Decorative unless `title` is given. */
export function CategoryIcon({ category, size = 20, className, title }: { category: string; size?: number; className?: string; title?: string }) {
  return <FaIcon icon={categoryIcon(category)} size={size} className={className} title={title} />;
}
