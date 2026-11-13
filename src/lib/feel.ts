/**
 * The feel of the site, in one place. Karan: these are yours to tune.
 * Change a number, save, and look at the page.
 *
 * The only rule the tests enforce: every colour in `spectrum` must stay
 * readable as text on white (contrast of 4.5 or more).
 */
export const feel = {
  // The colours that pass through a doorway, in order.
  spectrum: ['#e00b2f', '#c2410c', '#078629', '#0b7f8c', '#2152f5', '#8b2be2', '#d6127c'],

  shimmerMs: 4000, // one full trip of the colours through a doorway; lower is faster
  selectionMs: 6000, // how long selected text takes to cycle through the colours
  glowMs: 2400, // how long a doorway glows on a phone as it scrolls into view
  fringePx: 0.6, // colour fringe at the edges of lit letters

  lensDiameterPx: 92,
  lensZoom: 1.45,
  lensRimPx: 17, // width of the band where text bends
  lensFollow: 0.22, // 1 = glued to the cursor, lower = more lag
  lensStretch: 0.12, // how much it stretches when moving fast
};

/** The same values as CSS variables, written onto <html>. */
export function feelStyle(): string {
  const s = feel.spectrum;
  return [
    `--spectrum:${[...s, s[0]].join(',')}`,
    ...s.map((colour, i) => `--s${i}:${colour}`),
    `--fringe-a:${s[0]}`,
    `--fringe-b:${s[4 % s.length]}`,
    `--shimmer-ms:${feel.shimmerMs}ms`,
    `--selection-ms:${feel.selectionMs}ms`,
    `--fringe:${feel.fringePx}px`,
    `--lens-size:${feel.lensDiameterPx}px`,
  ].join(';');
}
