import { useState } from 'react';

// To load updates from Supabase, replace the static `updates` prop with a fetch:
// const { data } = await supabase
//   .from('project_updates')
//   .select('*')
//   .eq('project_slug', projectSlug)
//   .order('update_date', { ascending: false });

export default function ProjectUpdateLog({ updates = [], projectSlug }) {
  const [expanded, setExpanded] = useState(false);

  if (!updates || updates.length === 0) return null;

  const visible = expanded ? updates : updates.slice(0, 3);

  return (
    <div className="my-6 border-l-2 border-rule pl-4">
      <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-accent mb-4">
        Update Log
      </p>

      <div className="space-y-4">
        {visible.map((update, i) => (
          <div key={i} className="flex gap-4">
            <time className="font-mono text-[0.65rem] tracking-wide text-ink-muted whitespace-nowrap pt-0.5">
              {update.date}
            </time>
            <p className="font-serif text-[0.9rem] text-ink-secondary leading-relaxed">
              {update.text}
            </p>
          </div>
        ))}
      </div>

      {updates.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 font-mono text-[0.65rem] tracking-widest uppercase text-ink-muted hover:text-accent transition-colors duration-150"
        >
          {expanded ? '↑ Show Less' : `↓ Show ${updates.length - 3} More`}
        </button>
      )}
    </div>
  );
}
