import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ConstellationCanvas from './ConstellationCanvas.jsx';
import Constellation3D from './Constellation3D.jsx';
import EntryModal from './EntryModal.jsx';
import SearchBar from './SearchBar.jsx';
import CommonplaceEntry from '../interactive/CommonplaceEntry.jsx';

// To load from Supabase instead of static data, replace entries prop with:
// const { data: entries } = await supabase.from('commonplace_entries').select('*');

export default function CommonplaceBook({ entries = [] }) {
  const [mode, setMode] = useState('3d'); // overridden on mount for mobile
  useEffect(() => {
    if (window.innerWidth < 768) setMode('2d');
  }, []);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      entry.quote?.toLowerCase().includes(q) ||
      entry.sourceAuthor?.toLowerCase().includes(q) ||
      entry.tags?.some(t => t.toLowerCase().includes(q));
    const matchesTag = !activeTag || entry.tags?.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setMode('3d')}
            className={`hidden md:block font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
              mode === '3d'
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            3D
          </button>
          <button
            onClick={() => setMode('2d')}
            className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
              mode === '2d'
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setMode('list')}
            className={`font-mono text-[0.65rem] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors duration-150 ${
              mode === 'list'
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Tag filter strip */}
      {activeTag && (
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[0.6rem] tracking-wider uppercase text-ink-muted">
            Filtering by:
          </span>
          <button
            onClick={() => setActiveTag(null)}
            className="font-mono text-[0.6rem] tracking-[0.15em] uppercase px-2 py-0.5 bg-ink text-paper border border-ink"
          >
            {activeTag} ✕
          </button>
        </div>
      )}

      {/* Views */}
      <AnimatePresence mode="wait">
        {mode === '3d' ? (
          <motion.div
            key="constellation-3d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-[#111110] rounded-none"
            style={{ height: '70vh', minHeight: '500px' }}
          >
            <Constellation3D
              entries={filteredEntries}
              onSelectEntry={setSelectedEntry}
              searchQuery={searchQuery}
            />
          </motion.div>
        ) : mode === '2d' ? (
          <motion.div
            key="constellation-2d"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-[#111110] rounded-none"
            style={{ height: '70vh', minHeight: '500px' }}
          >
            <ConstellationCanvas
              entries={filteredEntries}
              onSelectEntry={setSelectedEntry}
              searchQuery={searchQuery}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filteredEntries.length === 0 ? (
              <p className="font-mono text-[0.7rem] tracking-wider text-ink-muted py-12 text-center">
                No entries match your search.
              </p>
            ) : (
              filteredEntries.map((entry) => (
                <CommonplaceEntry
                  key={entry.id}
                  entry={entry}
                  onTagClick={setActiveTag}
                  onSelect={setSelectedEntry}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry modal */}
      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
