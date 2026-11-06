import {
  faBox,
  faCakeCandles,
  faCampground,
  faFutbol,
  faHouse,
  faLayerGroup,
  faPlug,
  faScrewdriverWrench,
  faShirt,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/**
 * The one place category names and their icons are defined (Font Awesome Free, solid).
 * Map pins, the category filter, listing forms and shelf cards all read from here,
 * so changing an icon or adding a category is a one-line edit.
 */
export const CATEGORY_ICONS = {
  Home: faHouse,
  Electronics: faPlug,
  'Party Supplies': faCakeCandles,
  Outdoors: faCampground,
  Clothing: faShirt,
  Tools: faScrewdriverWrench,
  Sports: faFutbol,
} as const satisfies Record<string, IconDefinition>;

export type Category = keyof typeof CATEGORY_ICONS;

/** Every category, in the order forms and filters show them. */
export const CATEGORIES = Object.keys(CATEGORY_ICONS) as Category[];

/** Used for "All categories" in filters. */
export const ALL_CATEGORIES_ICON = faLayerGroup;
/** Used if an item ever has a category that isn't listed above. */
export const FALLBACK_CATEGORY_ICON = faBox;

export function categoryIcon(category: string): IconDefinition {
  return (CATEGORY_ICONS as Record<string, IconDefinition>)[category] ?? FALLBACK_CATEGORY_ICON;
}
