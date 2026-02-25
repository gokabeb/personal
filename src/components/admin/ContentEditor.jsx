import { useState } from 'react';
import { marked } from 'marked';

const TYPE_LABELS = { article: 'Article', project: 'Project', poem: 'Poem', commonplace: 'Commonplace Entry' };

const TYPE_PROMPTS = {
  article:     "Just write. Don't worry about formatting, titles, or structure — pour it all out.",
  project:     "Describe the project. What is it, what did you do, why does it matter? Don't worry about structure.",
  poem:        "Write your poem. Line breaks will be preserved exactly as you write them.",
  commonplace: "Paste the quote, source, and any personal annotation. The AI will separate them for you.",
};

const EMPTY_FORM = {
  article:    { title: '', lede: '', body: '', pull_quote: '', tags: '', prominence: 'standard' },
  project:    { headline: '', lede: '', body: '', pull_quote: '', label: 'WRITING', tags: '', prominence: 'standard' },
  poem:       { title: '', body: '', tags: '', year: new Date().getFullYear() },
  commonplace: { quote: '', source_author: '', source_work: '', source_url: '', annotation: '', tags: '' },
};

const PROMINENCE_OPTIONS = [
  { value: 'standard', label: 'Standard', desc: 'Grid / below the fold' },
  { value: 'secondary', label: 'Secondary', desc: 'Right sidebar on homepage' },
  { value: 'hero', label: 'Hero', desc: 'Big feature — top of homepage' },
];

export default function ContentEditor({ initialType = null, initialData = null, editId = null }) {
  const [step, setStep] = useState(initialType ? (initialData ? 3 : 2) : 1);
  const [type, setType] = useState(initialType);
  const [rawText, setRawText] = useState('');
  const [form, setForm] = useState(
    initialData
      ? { ...initialData, tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '' }
      : null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState(null); // null | 'saved' | 'published' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleTypeSelect = (t) => { setType(t); setStep(2); };

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, rawText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (type === 'commonplace') {
        setForm({
          ...EMPTY_FORM.commonplace,
          quote:        data.quote ?? '',
          source_author: data.source_author ?? '',
          source_work:   data.source_work ?? '',
          annotation:   data.annotation ?? '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        });
      } else {
        setForm({
          ...EMPTY_FORM[type],
          ...data,
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        });
      }
      setStep(3);
    } catch (e) {
      setErrorMsg('AI processing failed. You can fill in the fields manually below.');
      setForm({ ...EMPTY_FORM[type] });
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipAI = () => {
    setForm({ ...EMPTY_FORM[type] });
    setStep(3);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (draft = false) => {
    setIsPublishing(true);
    setStatus(null);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const data = type === 'commonplace'
        ? { ...form, tags }
        : { ...form, tags, slug: slugify(form.title || form.headline || '') };

      const res = await fetch('/api/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: editId, data, draft }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(draft ? 'saved' : 'published');
      if (!draft) {
        setTimeout(() => { window.location.href = '/admin/dashboard'; }, 1500);
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Delete this item permanently?')) return;
    await fetch('/api/content/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id: editId }),
    });
    window.location.href = '/admin/dashboard';
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* Step 1: Type picker */}
      {step === 1 && (
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-ink-muted mb-6">
            What are you creating?
          </p>
          <div className="flex flex-wrap gap-3">
            {['article', 'project', 'poem', 'commonplace'].map(t => (
              <button
                key={t}
                onClick={() => handleTypeSelect(t)}
                className="font-mono text-[0.7rem] tracking-widest uppercase border border-rule text-ink px-6 py-3 hover:border-ink hover:bg-[#F0EDE6] dark:hover:bg-night-paper transition-colors duration-150"
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Brain dump */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep(1)} className="font-mono text-[0.6rem] tracking-wider uppercase text-ink-muted hover:text-ink transition-colors">
              ← Back
            </button>
            <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-accent">
              New {TYPE_LABELS[type]}
            </span>
          </div>
          <p className="font-serif text-body text-ink-secondary mb-4">{TYPE_PROMPTS[type]}</p>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={type === 'poem' ? 'Write your poem here...' : 'Start writing...'}
            className="w-full h-80 font-serif text-body text-ink bg-transparent border border-rule focus:border-ink p-4 outline-none rounded-none resize-y transition-colors duration-150"
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleProcess}
              disabled={!rawText.trim() || isProcessing}
              className="font-mono text-[0.7rem] tracking-widest uppercase bg-ink text-paper px-6 py-2.5 hover:bg-ink-secondary transition-colors duration-150 disabled:opacity-40"
            >
              {isProcessing ? 'Processing…' : 'Process with AI →'}
            </button>
            <button
              onClick={handleSkipAI}
              className="font-mono text-[0.65rem] tracking-widest uppercase text-ink-muted hover:text-ink border-b border-transparent hover:border-ink-muted transition-colors duration-150"
            >
              Skip AI, fill manually
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Edit fields + preview */}
      {step === 3 && form && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep(2)} className="font-mono text-[0.6rem] tracking-wider uppercase text-ink-muted hover:text-ink transition-colors">
              ← Back
            </button>
            <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-accent">
              {editId ? `Editing ${TYPE_LABELS[type]}` : `New ${TYPE_LABELS[type]}`}
            </span>
          </div>

          {errorMsg && (
            <p className="font-mono text-[0.65rem] text-accent mb-4">{errorMsg}</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left: form fields */}
            <div className="space-y-4">

              {/* ── Commonplace fields ── */}
              {type === 'commonplace' && (<>
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Quote</label>
                  <textarea
                    value={form.quote ?? ''}
                    onChange={e => handleFormChange('quote', e.target.value)}
                    rows={6}
                    className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y text-ink"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Source Author</label>
                  <input
                    type="text"
                    value={form.source_author ?? ''}
                    onChange={e => handleFormChange('source_author', e.target.value)}
                    className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Source Work</label>
                  <input
                    type="text"
                    value={form.source_work ?? ''}
                    onChange={e => handleFormChange('source_work', e.target.value)}
                    className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Source URL</label>
                  <input
                    type="url"
                    value={form.source_url ?? ''}
                    onChange={e => handleFormChange('source_url', e.target.value)}
                    placeholder="https://"
                    className="w-full font-mono text-[0.8rem] bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Annotation</label>
                  <textarea
                    value={form.annotation ?? ''}
                    onChange={e => handleFormChange('annotation', e.target.value)}
                    rows={4}
                    className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y text-ink"
                  />
                </div>
              </>)}

              {/* ── Standard fields (non-commonplace) ── */}
              {type !== 'commonplace' && (<>
                {/* Title / Headline */}
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">
                    {type === 'project' ? 'Headline' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={form.headline ?? form.title ?? ''}
                    onChange={e => handleFormChange(type === 'project' ? 'headline' : 'title', e.target.value)}
                    className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                  />
                </div>

                {/* Lede (not for poems) */}
                {type !== 'poem' && (
                  <div>
                    <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Lede</label>
                    <textarea
                      value={form.lede ?? ''}
                      onChange={e => handleFormChange('lede', e.target.value)}
                      rows={2}
                      className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y text-ink"
                    />
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">
                    Body {type !== 'poem' && '(markdown supported)'}
                  </label>
                  <textarea
                    value={form.body ?? ''}
                    onChange={e => handleFormChange('body', e.target.value)}
                    rows={type === 'poem' ? 16 : 10}
                    className="w-full font-mono text-[0.8rem] bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y text-ink leading-relaxed"
                  />
                </div>

                {/* Pull quote (not for poems) */}
                {type !== 'poem' && (
                  <div>
                    <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Pull Quote</label>
                    <textarea
                      value={form.pull_quote ?? ''}
                      onChange={e => handleFormChange('pull_quote', e.target.value)}
                      rows={2}
                      className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none resize-y text-ink"
                    />
                  </div>
                )}

                {/* Label (projects only) */}
                {type === 'project' && (
                  <div>
                    <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Category</label>
                    <select
                      value={form.label ?? 'WRITING'}
                      onChange={e => { handleFormChange('label', e.target.value); handleFormChange('category', e.target.value); }}
                      className="w-full font-mono text-[0.8rem] bg-paper dark:bg-night border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                    >
                      {['NONPROFIT','RESEARCH','ENGINEERING','COMMUNITY','WRITING'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Year (poems only) */}
                {type === 'poem' && (
                  <div>
                    <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">Year</label>
                    <input
                      type="number"
                      value={form.year ?? ''}
                      onChange={e => handleFormChange('year', parseInt(e.target.value))}
                      className="w-full font-serif text-body bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                    />
                  </div>
                )}
              </>)}

              {/* Tags (all types) */}
              <div>
                <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-1">
                  Tags <span className="normal-case tracking-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.tags ?? ''}
                  onChange={e => handleFormChange('tags', e.target.value)}
                  placeholder="poetry, san-francisco, identity"
                  className="w-full font-mono text-[0.8rem] bg-transparent border border-rule focus:border-ink px-3 py-2 outline-none rounded-none text-ink"
                />
              </div>

              {/* Placement (articles + projects only) */}
              {type !== 'poem' && type !== 'commonplace' && (
                <div>
                  <label className="block font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-muted mb-2">
                    Placement
                  </label>
                  <div className="flex flex-col gap-2">
                    {PROMINENCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleFormChange('prominence', opt.value)}
                        className={`flex items-center gap-3 px-3 py-2.5 border text-left transition-colors duration-150 ${
                          (form.prominence ?? 'standard') === opt.value
                            ? 'border-ink bg-ink text-paper'
                            : 'border-rule text-ink hover:border-ink'
                        }`}
                      >
                        <span className="font-mono text-[0.65rem] tracking-widest uppercase w-20">{opt.label}</span>
                        <span className="font-serif text-[0.8rem] opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isPublishing}
                  className="font-mono text-[0.7rem] tracking-widest uppercase bg-ink text-paper px-6 py-2.5 hover:bg-ink-secondary transition-colors duration-150 disabled:opacity-40"
                >
                  {isPublishing ? 'Publishing…' : 'Publish →'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isPublishing}
                  className="font-mono text-[0.65rem] tracking-widest uppercase border border-rule text-ink-muted px-4 py-2.5 hover:border-ink hover:text-ink transition-colors duration-150 disabled:opacity-40"
                >
                  Save Draft
                </button>
                {editId && (
                  <button
                    onClick={handleDelete}
                    className="font-mono text-[0.65rem] tracking-widest uppercase text-accent hover:text-accent-hover ml-auto transition-colors duration-150"
                  >
                    Delete
                  </button>
                )}
              </div>

              {status === 'published' && (
                <p className="font-mono text-[0.65rem] tracking-wider text-ink">
                  ✓ Published. Rebuild triggered — live in ~90 seconds.
                </p>
              )}
              {status === 'saved' && (
                <p className="font-mono text-[0.65rem] tracking-wider text-ink-muted">✓ Saved as draft.</p>
              )}
              {status === 'error' && (
                <p className="font-mono text-[0.65rem] tracking-wider text-accent">Error: {errorMsg}</p>
              )}
            </div>

            {/* Right: live preview */}
            <div className="border-l border-rule pl-8">
              <p className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-ink-muted mb-4">Preview</p>
              <ContentPreview type={type} form={form} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentPreview({ type, form }) {
  if (!form) return null;

  if (type === 'commonplace') {
    return (
      <div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '1rem' }}>
          Commonplace Entry
        </span>
        {form.quote && (
          <blockquote style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '1.25rem', margin: '0 0 1rem', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--ink)', lineHeight: 1.5 }}>
            "{form.quote}"
          </blockquote>
        )}
        {(form.source_author || form.source_work) && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
            — {form.source_author}{form.source_work ? `, ${form.source_work}` : ''}
          </p>
        )}
        {form.annotation && (
          <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--ink-secondary)' }}>
            {form.annotation}
          </p>
        )}
        {form.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '1rem' }}>
            {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid var(--rule)', padding: '0.2rem 0.5rem', color: 'var(--ink-muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const titleText = form.headline ?? form.title ?? '';
  const bodyHtml = form.body
    ? (type === 'poem'
        ? form.body.split('\n').map(l => l ? `<p style="margin:0">${l}</p>` : '<br/>').join('')
        : marked.parse(form.body))
    : '';

  return (
    <div>
      {/* Label */}
      {(form.label || type) && (
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '0.5rem' }}>
          {form.label ?? type.toUpperCase()}
        </span>
      )}

      {/* Title */}
      {titleText && (
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1.15, color: 'var(--ink)', marginBottom: '0.75rem' }}>
          {titleText}
        </h2>
      )}

      {/* Lede */}
      {form.lede && (
        <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
          {form.lede}
        </p>
      )}

      {/* Body */}
      {bodyHtml && (
        <div
          style={{ fontFamily: 'Source Serif 4, serif', fontSize: '1rem', lineHeight: type === 'poem' ? 2 : 1.75, color: 'var(--ink-secondary)', marginBottom: '1rem' }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {/* Pull quote */}
      {form.pull_quote && (
        <blockquote style={{ borderLeft: '4px solid var(--accent)', paddingLeft: '1.25rem', margin: '1.5rem 0', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--ink)', lineHeight: 1.4 }}>
          "{form.pull_quote}"
        </blockquote>
      )}

      {/* Tags */}
      {form.tags && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '1rem' }}>
          {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
            <span key={tag} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid var(--rule)', padding: '0.2rem 0.5rem', color: 'var(--ink-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}
