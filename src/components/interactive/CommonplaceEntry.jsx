export default function CommonplaceEntry({ entry, onTagClick, onSelect }) {
  return (
    <article
      className="border-b border-rule py-8 cursor-pointer group hover:bg-[#F0EDE6] dark:hover:bg-night-paper -mx-4 px-4 transition-colors duration-150"
      onClick={() => onSelect?.(entry)}
    >
      <blockquote className="font-display italic text-[1.1rem] leading-[1.55] text-ink mb-4 group-hover:text-ink">
        "{entry.quote}"
      </blockquote>

      <div className="flex items-baseline gap-2 mb-3">
        <p className="font-mono text-[0.65rem] tracking-widest uppercase text-accent">
          — {entry.sourceAuthor}
        </p>
        {entry.sourceWork && (
          <p className="font-mono text-[0.6rem] tracking-wide text-ink-muted">
            {entry.sourceWork}{entry.sourceYear ? `, ${entry.sourceYear}` : ''}
          </p>
        )}
      </div>

      {entry.annotation && (
        <p className="font-serif text-[0.9rem] leading-relaxed text-ink-secondary mb-4">
          {entry.annotation}
        </p>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
              className="font-mono text-[0.6rem] tracking-[0.15em] uppercase px-2 py-0.5 border border-rule text-ink-muted hover:border-accent hover:text-accent transition-colors duration-150"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
