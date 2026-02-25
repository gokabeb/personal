import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function EntryModal({ entry, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!entry) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 backdrop-blur-sm bg-black/50"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          className="relative z-10 bg-[#FAF8F3] dark:bg-[#1C1C1A] max-w-xl w-full p-8 shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 font-mono text-[0.7rem] tracking-wider uppercase text-[#8A8A7A] hover:text-[#1A1A17] dark:hover:text-[#E8E4DC] transition-colors duration-150"
          >
            Close ✕
          </button>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[0.6rem] tracking-[0.15em] uppercase px-2 py-0.5 border border-[#D4CFC4] dark:border-[#2E2E2A] text-[#8A8A7A]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Quote */}
          <blockquote className="font-display italic text-[1.3rem] leading-[1.5] text-[#1A1A17] dark:text-[#E8E4DC] mb-5">
            "{entry.quote}"
          </blockquote>

          {/* Attribution */}
          <div className="mb-5 pb-5 border-b border-[#D4CFC4] dark:border-[#2E2E2A]">
            <p className="font-mono text-[0.65rem] tracking-widest uppercase text-[#C41E3A]">
              — {entry.sourceAuthor}
            </p>
            {entry.sourceWork && (
              <p className="font-mono text-[0.6rem] tracking-wide text-[#8A8A7A] mt-0.5">
                {entry.sourceWork}{entry.sourceYear ? `, ${entry.sourceYear}` : ''}
              </p>
            )}
            {entry.sourceUrl && (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.6rem] tracking-widest uppercase text-accent hover:text-accent-hover border-b border-accent pb-0.5 transition-colors duration-150 block mt-2"
              >
                View Source →
              </a>
            )}
          </div>

          {/* Annotation */}
          {entry.annotation && (
            <div>
              <p className="font-mono text-[0.6rem] tracking-widest uppercase text-[#8A8A7A] mb-2">
                Annotation
              </p>
              <p className="font-serif text-[0.95rem] leading-relaxed text-[#3D3D38] dark:text-[#C8C4BC]">
                {entry.annotation}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
