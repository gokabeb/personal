export default function SearchBar({ query, onQueryChange }) {
  return (
    <div className="relative max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search quotes, authors, themes…"
        className="w-full font-mono text-[0.8rem] tracking-wide bg-transparent border border-rule focus:border-ink px-4 py-2.5 outline-none transition-colors duration-150 text-ink placeholder:text-ink-muted"
      />
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors duration-150 font-mono text-[0.7rem]"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
