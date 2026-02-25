import { useState } from 'react';

const CATEGORIES = ['ALL', 'NONPROFIT', 'RESEARCH', 'ENGINEERING', 'COMMUNITY', 'WRITING'];

export default function TagFilter({ onFilterChange }) {
  const [active, setActive] = useState('ALL');

  const handleClick = (cat) => {
    setActive(cat);
    onFilterChange?.(cat);
    // Also dispatch a DOM event so Astro page scripts can react
    document.dispatchEvent(new CustomEvent('tagfilter:change', { detail: cat }));
  };

  return (
    <div className="flex flex-wrap gap-2 py-4 mb-8 border-b border-rule">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
            active === cat
              ? 'border-ink bg-ink text-paper'
              : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
