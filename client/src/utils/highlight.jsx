import React from 'react';

/**
 * Renders text with matched query words highlighted using <mark> tags.
 */
export function HighlightedText({ text = '', query = '' }) {
  if (!text) return null;
  if (!query || !query.trim()) {
    return <span>{text}</span>;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));

  if (terms.length === 0) {
    return <span>{text}</span>;
  }

  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, index) => {
        const isMatch = terms.some(
          (t) => t.toLowerCase() === part.toLowerCase()
        );
        return isMatch ? (
          <mark key={index} className="bg-amber-200 text-amber-950 dark:bg-amber-400/90 dark:text-slate-950 px-1 py-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}
