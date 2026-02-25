/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['5rem', { lineHeight: '1.05' }],
        headline: ['2.5rem', { lineHeight: '1.15' }],
        subhead: ['1.5rem', { lineHeight: '1.3' }],
        body: ['1.125rem', { lineHeight: '1.75' }],
        caption: ['0.8rem', { lineHeight: '1.5' }],
        'mono-sm': ['0.75rem', { lineHeight: '1.4' }],
      },
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        night: 'var(--night)',
        'night-paper': 'var(--night-paper)',
        'night-ink': 'var(--night-ink)',
        'night-accent': 'var(--night-accent)',
      },
      maxWidth: {
        content: '1400px',
      },
      keyframes: {
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        ticker: 'ticker-scroll 40s linear infinite',
        'fade-up': 'fade-up 0.5s ease forwards',
      },
    },
  },
  plugins: [],
};
