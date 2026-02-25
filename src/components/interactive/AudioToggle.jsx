import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AudioToggle({ onModeChange }) {
  const [isListenMode, setIsListenMode] = useState(false);

  const toggle = () => {
    const next = !isListenMode;
    setIsListenMode(next);
    onModeChange?.(next);
    document.dispatchEvent(new CustomEvent('audiomode:change', { detail: next }));
  };

  return (
    <div className="flex items-center gap-3 mb-8">
      <button
        onClick={toggle}
        className="flex items-center gap-2 font-mono text-[0.7rem] tracking-widest uppercase border border-rule px-4 py-2 hover:border-ink transition-colors duration-150"
        aria-label={isListenMode ? 'Switch to read mode' : 'Switch to listen mode'}
      >
        <AnimatePresence mode="wait">
          {isListenMode ? (
            <motion.span
              key="book"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {/* Book icon */}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Read Mode
            </motion.span>
          ) : (
            <motion.span
              key="radio"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {/* Radio/headphone icon */}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Listen Mode
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <span className="font-mono text-[0.6rem] tracking-wider text-ink-muted">
        {isListenMode ? 'Audio readings where available' : 'Full text view'}
      </span>
    </div>
  );
}
