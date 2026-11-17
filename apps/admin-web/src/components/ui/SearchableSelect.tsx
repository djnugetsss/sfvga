'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
}

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches found.',
  disabled = false,
}: {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''} ${option.searchText ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery('');
          setOpen((current) => !current);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-ink shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:border-accentStrong focus-visible:ring-0"
      >
        <span className={selected ? 'min-w-0' : 'text-muted/65'}>
          <span className="block truncate">{selected?.label ?? placeholder}</span>
          {selected?.description ? (
            <span className="mt-0.5 block truncate text-xs text-muted">{selected.description}</span>
          ) : null}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_rgba(46,28,20,0.16)]">
          <div className="border-b border-border bg-surfaceMuted/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accentStrong">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-muted"
              >
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="m12.5 12.5 4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="searchable-select-input min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-ink shadow-none outline-none placeholder:text-muted/65"
              />
            </div>
          </div>
          <div role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-accentSoft focus:bg-accentSoft focus:outline-none ${
                    option.value === value ? 'bg-accentSoft' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <span className="text-sm font-bold text-accentStrong" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
