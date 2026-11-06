import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon";
import { getSearchSuggestions, type BorrowItem } from "./items";

type Props = {
  value: string;
  recentSearches: string[];
  catalog?: BorrowItem[];
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

export function SearchOverlay({
  value,
  recentSearches,
  catalog,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    input.current?.focus();
    return () => node?.close();
  }, []);
  const suggestions = getSearchSuggestions(value, recentSearches, catalog);
  const prefix = value.trim();

  return (
    // Present search as a native dialog with draft text and selectable suggestions.
    <dialog
      ref={dialog}
      className="search-overlay"
      aria-label="Search for an item"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="search-overlay-header">
        <form
          className="search-field search-overlay-field"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <button
            type="button"
            className="plain-icon"
            aria-label="Cancel search"
            onClick={onClose}
          >
            <Icon name="back" width={24} />
          </button>
          <label className="sr-only" htmlFor="search-query">
            Search query
          </label>
          <input
            id="search-query"
            ref={input}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search for an item..."
          />
          {value && (
            <button
              type="button"
              className="plain-icon"
              aria-label="Clear search"
              onClick={() => {
                onChange("");
                input.current?.focus();
              }}
            >
              <Icon name="clear-search" width={20} />
            </button>
          )}
        </form>
      </header>
      <ul className="search-suggestions" aria-label="Search suggestions">
        {suggestions.map((suggestion) => {
          const matchedPrefix =
            prefix &&
            suggestion
              .toLocaleLowerCase()
              .startsWith(prefix.toLocaleLowerCase())
              ? suggestion.slice(0, prefix.length)
              : "";
          return (
            // Represent one matching search suggestion with selection and draft-fill controls.
            <li key={suggestion}>
              <button
                className="suggestion-select"
                type="button"
                onClick={() => onSubmit(suggestion)}
              >
                <Icon name="suggestion-search" width={16} />
                <span>
                  {matchedPrefix}
                  <strong>{suggestion.slice(matchedPrefix.length)}</strong>
                </span>
              </button>
              <button
                className="suggestion-fill"
                type="button"
                aria-label={`Use ${suggestion} in search`}
                onClick={() => {
                  onChange(suggestion);
                  input.current?.focus();
                }}
              >
                <Icon name="suggestion-arrow" width={16} />
              </button>
            </li>
          );
        })}
      </ul>
      {!suggestions.length && (
        <p className="search-hint">Press Enter or Search to find items.</p>
      )}
    </dialog>
  );
}
