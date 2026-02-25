import { useState } from 'react';

const PAGES = ['Homepage', 'Work', 'Poetry', 'Articles', 'About', 'Contact'];

const PAGE_FIELDS = {
  Homepage: [
    {
      section: 'Poetry Desk',
      items: [
        { key: 'poetry_desk_quote', label: 'Pull Quote', rows: 3 },
        { key: 'poetry_desk_attribution', label: 'Quote Attribution', rows: 1 },
        { key: 'poetry_desk_headline', label: 'Headline', rows: 1 },
        { key: 'poetry_desk_body', label: 'Body (paragraphs separated by blank line)', rows: 6 },
      ],
    },
    {
      section: 'Press Strip',
      items: [
        { key: 'press_mentions', label: 'Press Mentions (comma-separated)', rows: 2 },
      ],
    },
    {
      section: 'Awards Strip',
      items: [
        { key: 'awards', label: 'Awards (comma-separated)', rows: 3 },
      ],
    },
  ],
  Work: [
    {
      section: 'Page Header',
      items: [
        { key: 'work_description', label: 'Description', rows: 3 },
      ],
    },
  ],
  Poetry: [
    {
      section: 'Page Header',
      items: [
        { key: 'poetry_headline', label: 'Headline', rows: 1 },
        { key: 'poetry_description', label: 'Description', rows: 3 },
      ],
    },
  ],
  Articles: [
    {
      section: 'Page Header',
      items: [
        { key: 'articles_description', label: 'Description', rows: 2 },
      ],
    },
  ],
  About: [
    {
      section: 'Header',
      items: [
        { key: 'about_byline', label: 'Byline (location · year · pronouns)', rows: 1 },
      ],
    },
    {
      section: 'Fact Box',
      items: [
        { key: 'about_role', label: 'Current Role', rows: 1 },
        { key: 'about_research', label: 'Research', rows: 1 },
        { key: 'about_engineering', label: 'Engineering', rows: 1 },
        { key: 'about_founded', label: 'Founded', rows: 1 },
        { key: 'about_education', label: 'Education', rows: 1 },
        { key: 'about_interests', label: 'Interests', rows: 1 },
      ],
    },
    {
      section: 'Essay',
      items: [
        { key: 'about_pull_quote', label: 'Pull Quote', rows: 3 },
        { key: 'about_essay', label: 'Essay (paragraphs separated by blank line)', rows: 14 },
      ],
    },
    {
      section: 'Recognition',
      items: [
        { key: 'about_recognition', label: 'One per line: "YEAR: description"', rows: 8 },
      ],
    },
  ],
  Contact: [
    {
      section: 'Intro',
      items: [
        { key: 'contact_intro', label: 'Intro paragraph', rows: 3 },
      ],
    },
    {
      section: 'Classifieds',
      items: [
        { key: 'contact_classifieds', label: 'One per line: "LABEL: text"', rows: 8 },
      ],
    },
  ],
};

export default function SiteContentEditor({ initialContent = {} }) {
  const [activePage, setActivePage] = useState('Homepage');
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const results = await Promise.all(
      Object.entries(content).map(([key, value]) =>
        fetch('/api/content/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        }).then(r => r.json())
      )
    );
    setSaving(false);
    setStatus(results.some(r => r.error) ? 'error' : 'saved');
  };

  const fields = PAGE_FIELDS[activePage] ?? [];

  return (
    <div>
      {/* Page tabs */}
      <div className="flex flex-wrap gap-0 mb-8 border-b border-rule">
        {PAGES.map(page => (
          <button
            key={page}
            onClick={() => setActivePage(page)}
            className={`font-mono text-[0.65rem] tracking-widest uppercase px-4 py-2.5 border-b-2 transition-colors duration-150 ${
              activePage === page
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Left: form */}
        <div>
          {fields.map(({ section, items }) => (
            <div key={section} className="mb-8">
              <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-accent mb-4">{section}</h2>
              <div className="space-y-4">
                {items.map(({ key, label, rows }) => (
                  <div key={key}>
                    <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1.5">
                      {label}
                    </label>
                    <textarea
                      value={content[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      rows={rows}
                      className="w-full font-serif text-body text-ink bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y transition-colors duration-150 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 pt-2 border-t border-rule">
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-mono text-[0.7rem] tracking-widest uppercase bg-ink text-paper px-6 py-2.5 hover:bg-ink-secondary transition-colors duration-150 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save All →'}
            </button>
            {status === 'saved' && (
              <span className="font-mono text-[0.65rem] tracking-wider text-ink">✓ Saved. Rebuild to go live.</span>
            )}
            {status === 'error' && (
              <span className="font-mono text-[0.65rem] tracking-wider text-accent">Error saving. Try again.</span>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-ink-muted mb-4">Live Preview</p>
          <div className="border border-rule p-6 overflow-y-auto max-h-[80vh]">
            {activePage === 'Homepage' && <HomepagePreview content={content} />}
            {activePage === 'Work' && <WorkPreview content={content} />}
            {activePage === 'Poetry' && <PoetryPreview content={content} />}
            {activePage === 'Articles' && <ArticlesPreview content={content} />}
            {activePage === 'About' && <AboutPreview content={content} />}
            {activePage === 'Contact' && <ContactPreview content={content} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview Components ─────────────────────────────────────── */

function HomepagePreview({ content }) {
  return (
    <div className="space-y-6">
      {/* Poetry Desk */}
      <div>
        <PreviewLabel>Poetry Desk</PreviewLabel>
        <div style={{ background: '#F2EFE8', padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '1rem' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--ink)', marginBottom: '0.4rem' }}>
              "{content.poetry_desk_quote || '…'}"
            </p>
            {content.poetry_desk_attribution && (
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                — {content.poetry_desk_attribution}
              </p>
            )}
          </div>
          <div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.4rem' }}>The Poetry Desk</span>
            <p style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>{content.poetry_desk_headline || '…'}</p>
            {(content.poetry_desk_body || '').split('\n\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ fontFamily: 'Source Serif 4, serif', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--ink-secondary)', marginBottom: '0.4rem' }}>{p}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Press Strip */}
      <div>
        <PreviewLabel>Press Strip</PreviewLabel>
        <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid var(--rule)' }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1rem', color: 'var(--ink-muted)', lineHeight: 1.8 }}>
            {(content.press_mentions || '').split(',').map((name, i, arr) => (
              <span key={i}>{name.trim()}{i < arr.length - 1 && <span style={{ margin: '0 0.6rem', color: 'var(--rule)' }}>·</span>}</span>
            ))}
          </p>
        </div>
      </div>

      {/* Awards Strip */}
      <div>
        <PreviewLabel>Awards Strip</PreviewLabel>
        <div style={{ background: 'var(--ink)', padding: '1rem' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: '0.6rem' }}>Recognition</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {(content.awards || '').split(',').map((award, i, arr) => (
              <span key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,248,243,0.7)' }}>
                {award.trim()}{i < arr.length - 1 && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkPreview({ content }) {
  return (
    <div>
      <PreviewLabel>Page Header</PreviewLabel>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '2rem', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '0.5rem' }}>Work</h1>
      <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1rem', lineHeight: 1.7, color: 'var(--ink-secondary)', maxWidth: '55ch' }}>
        {content.work_description || '…'}
      </p>
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', border: '1px dashed var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        ↓ Projects from Supabase appear below
      </div>
    </div>
  );
}

function PoetryPreview({ content }) {
  return (
    <div>
      <PreviewLabel>Page Header</PreviewLabel>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.5rem' }}>The Poetry Archive</span>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '0.75rem' }}>
        {content.poetry_headline || '…'}
      </h1>
      <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1rem', lineHeight: 1.7, color: 'var(--ink-secondary)', maxWidth: '65ch' }}>
        {content.poetry_description || '…'}
      </p>
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', border: '1px dashed var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        ↓ Poems from Supabase appear below
      </div>
    </div>
  );
}

function ArticlesPreview({ content }) {
  return (
    <div>
      <PreviewLabel>Page Header</PreviewLabel>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.5rem' }}>Essays & Dispatches</span>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '0.75rem' }}>Articles</h1>
      <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1rem', lineHeight: 1.7, color: 'var(--ink-secondary)', maxWidth: '55ch' }}>
        {content.articles_description || '…'}
      </p>
      <div style={{ marginTop: '1.5rem', padding: '0.75rem', border: '1px dashed var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        ↓ Published articles appear below
      </div>
    </div>
  );
}

function AboutPreview({ content }) {
  const recognitionItems = (content.about_recognition || '').split('\n').filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    return idx > -1 ? { year: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() } : null;
  }).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <PreviewLabel>Header</PreviewLabel>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.3rem' }}>Profile</span>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.75rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>Karan Gupta</h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          {content.about_byline || '…'}
        </p>
      </div>

      {/* Fact box */}
      <div>
        <PreviewLabel>Fact Box</PreviewLabel>
        <div style={{ border: '1px solid var(--rule)', padding: '1rem', background: '#F2EFE8' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>At a Glance</p>
          {[
            ['Current Role', content.about_role],
            ['Research', content.about_research],
            ['Engineering', content.about_engineering],
            ['Founded', content.about_founded],
            ['Education', content.about_education],
            ['Interests', content.about_interests],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'block' }}>{label}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', color: 'var(--ink)' }}>{val || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pull quote */}
      {content.about_pull_quote && (
        <div>
          <PreviewLabel>Pull Quote</PreviewLabel>
          <blockquote style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '1rem', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.5, color: 'var(--ink)' }}>
            "{content.about_pull_quote}"
          </blockquote>
        </div>
      )}

      {/* Essay */}
      {content.about_essay && (
        <div>
          <PreviewLabel>Essay</PreviewLabel>
          {(content.about_essay).split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontFamily: 'Source Serif 4, serif', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>{para}</p>
          ))}
        </div>
      )}

      {/* Recognition */}
      {recognitionItems.length > 0 && (
        <div>
          <PreviewLabel>Recognition</PreviewLabel>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recognitionItems.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', flexShrink: 0, marginTop: '0.2rem' }}>{item.year}</span>
                <span style={{ fontFamily: 'Source Serif 4, serif', fontSize: '0.9rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ContactPreview({ content }) {
  const classifieds = (content.contact_classifieds || '').split('\n').filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    return idx > -1 ? { label: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() } : null;
  }).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div>
        <PreviewLabel>Intro</PreviewLabel>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.4rem' }}>Get In Touch</span>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.75rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>Contact</h1>
        <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1rem', lineHeight: 1.7, color: 'var(--ink-secondary)' }}>
          {content.contact_intro || '…'}
        </p>
        <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--rule)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ↓ Contact form appears here
        </div>
      </div>

      {/* Classifieds */}
      {classifieds.length > 0 && (
        <div>
          <PreviewLabel>Classifieds</PreviewLabel>
          <div style={{ columns: 2, gap: '1.5rem' }}>
            {classifieds.map((item, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: '1rem' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.25rem' }}>{item.label}</p>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', lineHeight: 1.6, color: 'var(--ink-secondary)' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewLabel({ children }) {
  return (
    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)', borderBottom: '1px solid var(--rule)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
      {children}
    </p>
  );
}
