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
} from '../components/ui/icons';
import type { IconDefinition } from '../components/ui/icons';


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

export const CATEGORIES = Object.keys(CATEGORY_ICONS) as Category[];

export const ALL_CATEGORIES_ICON = faLayerGroup;
export const FALLBACK_CATEGORY_ICON = faBox;

export function categoryIcon(category: string): IconDefinition {
  return (CATEGORY_ICONS as Record<string, IconDefinition>)[category] ?? FALLBACK_CATEGORY_ICON;
}
