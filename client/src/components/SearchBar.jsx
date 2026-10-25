import React, { useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  onClear,
  isLoading,
  totalResults,
  isSearching,
}) {
  const inputRef = useRef(null);

  // Global keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="relative group">
        {/* Glow backdrop on focus */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 via-indigo-500/20 to-sky-500/20 rounded-2xl blur-lg opacity-40 group-focus-within:opacity-100 transition duration-300 pointer-events-none" />

        <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm group-focus-within:border-brand-500 dark:group-focus-within:border-brand-400 group-focus-within:shadow-lg transition-all">
          {/* Leading Icon or Spinner */}
          <div className="pl-4 sm:pl-5 pr-2 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            ) : (
              <Search className="w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
            )}
          </div>

          {/* Big Input */}
          <input
            ref={inputRef}
            type="text"
            id="screenshot-search-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type any word inside your screenshots (e.g. 'UPI', 'invoice #42', 'def calculate', 'flight')..."
            className="w-full py-4 text-base sm:text-lg bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            aria-label="Search screenshots by text, caption, or tags"
          />

          {/* Trailing Controls: Clear and Shortcut Badge */}
          <div className="pr-4 flex items-center space-x-2">
            {value && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Keyboard shortcut indicator */}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              <span className="text-[11px]">/</span>
            </kbd>
          </div>
        </div>
      </div>

      {/* Search status caption */}
      {isSearching && (
        <div className="mt-2 px-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>
              Searching OCR text, AI captions, and auto-tags for &ldquo;
              <strong className="text-slate-700 dark:text-slate-300">{value}</strong>
              &rdquo;
            </span>
          </div>
          {totalResults !== null && (
            <span>
              {totalResults} {totalResults === 1 ? 'match' : 'matches'} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}
