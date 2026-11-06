import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import { CategoryIcon, FaIcon } from '../../components/ui/CategoryIcon';
import { ALL_CATEGORIES_ICON } from '../../app/categories';

type Option = { value: string; label: string };

/**
 * Category filter with an icon beside every option. Native <select> can't show
 * icons, so this is a button + listbox with the same keyboard behaviour
 * (arrows, Home/End, Enter/Space to choose, Escape to close, type to jump).
 */
export function CategorySelect({ value, categories, onChange }: { value: string; categories: string[]; onChange: (value: string) => void }) {
  const options: Option[] = [{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, minWidth: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find(o => o.value === value) ?? options[0];

  function show() {
    const r = button.current?.getBoundingClientRect();
    // Fixed position so the filter bar's horizontal scroll can't clip the list.
    if (r) setPos({ left: r.left, top: r.bottom + 4, minWidth: r.width });
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    setOpen(true);
  }
  function choose(i: number) { onChange(options[i].value); setOpen(false); button.current?.focus(); }

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const close = (e: Event) => { if (!list.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false); };
    const dismiss = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', dismiss);
    document.addEventListener('scroll', dismiss, true);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', dismiss); document.removeEventListener('scroll', dismiss, true); };
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  function onListKey(e: KeyboardEvent) {
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive(a => Math.min(last, a + 1)), ArrowUp: () => setActive(a => Math.max(0, a - 1)),
      Home: () => setActive(0), End: () => setActive(last),
      Enter: () => choose(active), ' ': () => choose(active),
      Escape: () => { setOpen(false); button.current?.focus(); }, Tab: () => setOpen(false),
    };
    if (keys[e.key]) { if (e.key !== 'Tab') e.preventDefault(); keys[e.key](); return; }
    if (e.key.length === 1) { // type-ahead: jump to the next option starting with that letter
      const from = (active + 1) % options.length;
      const hit = [...options.slice(from), ...options.slice(0, from)].find(o => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (hit) setActive(options.indexOf(hit));
    }
  }

  return <div className="select-field category-select">
    <button ref={button} type="button" className="category-select__button" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={`${id}-list`} aria-label={`Category: ${selected.label}`}
      onClick={() => (open ? setOpen(false) : show())}
      onKeyDown={e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); show(); } }}>
      {value === 'all' ? <FaIcon icon={ALL_CATEGORIES_ICON} size={14} /> : <CategoryIcon category={value} size={14} />}
      <span>{selected.label}</span>
    </button>
    <Icon name="chevron-down" width={16} />
    {open && <ul ref={list} id={`${id}-list`} className="category-select__list" role="listbox" tabIndex={-1}
      aria-label="Category" aria-activedescendant={`${id}-${active}`} onKeyDown={onListKey}
      style={{ left: pos.left, top: pos.top, minWidth: pos.minWidth }}>
      {options.map((o, i) => <li key={o.value} id={`${id}-${i}`} data-index={i} role="option" aria-selected={o.value === value}
        className={`category-select__option${i === active ? ' is-active' : ''}`}
        onPointerEnter={() => setActive(i)} onClick={() => choose(i)}>
        <span className="category-select__icon">{o.value === 'all' ? <FaIcon icon={ALL_CATEGORIES_ICON} size={18} /> : <CategoryIcon category={o.value} size={18} />}</span>
        {o.label}
      </li>)}
    </ul>}
  </div>;
}
