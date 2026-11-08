import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/ui/shared';
import { CategoryIcon, FaIcon } from '../../components/ui/CategoryIcon';
import { ALL_CATEGORIES_ICON } from '../../app/categories';
import { faCheck } from '../../components/ui/icons';

/**
 * Category filter, mobile-first: the chip opens a bottom sheet listing every
 * category with its icon as a large tap target. Built on the app's Modal (a
 * native modal <dialog>), so the page behind is inert while it's open: taps and
 * scrolls can't fall through, Escape or tapping outside closes it, and focus
 * returns to the chip.
 */
export function CategorySelect({ value, categories, onChange }: { value: string; categories: string[]; onChange: (value: string) => void }) {
  const options = [{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))];
  const selected = options.find(o => o.value === value) ?? options[0];
  const [open, setOpen] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const current = useRef<HTMLButtonElement>(null);

  // Start on the chosen option so keyboard and screen-reader users land in context.
  useEffect(() => { if (open) current.current?.focus(); }, [open]);

  function close() { setOpen(false); chip.current?.focus(); }
  function choose(next: string) { onChange(next); close(); }

  return <div className="select-field category-select">
    <button ref={chip} type="button" className="category-select__button" aria-haspopup="dialog" aria-expanded={open}
      aria-label={`Category: ${selected.label}`} onClick={() => setOpen(true)}>
      {value === 'all' ? <FaIcon icon={ALL_CATEGORIES_ICON} size={14} /> : <CategoryIcon category={value} size={14} />}
      <span>{selected.label}</span>
    </button>
    <Icon name="chevron-down" width={16} />

    {open && <Modal title="Category" className="bottom-sheet category-sheet" onClose={close}>
      <ul className="category-sheet__list">
        {options.map(o => {
          const isSelected = o.value === value;
          return <li key={o.value}>
            <button ref={isSelected ? current : undefined} type="button" className="category-sheet__option"
              aria-pressed={isSelected} onClick={() => choose(o.value)}>
              <span className="category-sheet__icon">{o.value === 'all' ? <FaIcon icon={ALL_CATEGORIES_ICON} size={20} /> : <CategoryIcon category={o.value} size={20} />}</span>
              <span className="category-sheet__label">{o.label}</span>
              {isSelected && <FaIcon icon={faCheck} size={16} className="category-sheet__check" />}
            </button>
          </li>;
        })}
      </ul>
    </Modal>}
  </div>;
}
