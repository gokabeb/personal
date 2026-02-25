import { useState, useRef } from 'react';

// Replace videoUrl with actual Cloudinary URL:
// https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/YOUR_VIDEO_ID.mp4

export default function VideoCard({ label, headline, lede, href, videoUrl, videoPlaceholder }) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <a
      href={href || '#'}
      className="group block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video / placeholder container */}
      <div className="relative aspect-video overflow-hidden bg-[#1A1A17] mb-3">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}

        {/* Placeholder overlay — visible when no video or not yet hovered */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            isHovered && videoUrl ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="text-center px-4">
            <div className="w-8 h-8 border border-[#444] rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-3 h-3 text-[#666] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {videoPlaceholder && (
              <p className="font-mono text-[0.6rem] tracking-wider uppercase text-[#555] leading-relaxed">
                {videoPlaceholder}
              </p>
            )}
          </div>
        </div>
      </div>

      {label && (
        <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-accent block mb-1">
          {label}
        </span>
      )}

      <h3 className="font-display font-bold text-[1.1rem] text-ink leading-[1.25] mb-1 group-hover:underline decoration-accent underline-offset-4 decoration-2">
        {headline}
      </h3>

      {lede && (
        <p className="font-serif text-caption text-ink-secondary leading-relaxed line-clamp-2">
          {lede}
        </p>
      )}
    </a>
  );
}
