/**
 * Where to move the enlarged copy of the page so that page point (cx, cy)
 * lands at the centre of a lens of the given radius. The copy is scaled by
 * `zoom` from its own top-left corner.
 */
export function cloneOffset(cx: number, cy: number, zoom: number, radius: number): { x: number; y: number } {
  return { x: radius - cx * zoom, y: radius - cy * zoom };
}

/** How strongly the glass bends light at distance r from its centre: 0 in the flat middle, 1 at the edge. */
export function rimBend(r: number, radius: number, rim: number): number {
  if (rim <= 0) return r >= radius ? 1 : 0;
  const t = Math.min(1, Math.max(0, (r - (radius - rim)) / rim));
  return t * t * (3 - 2 * t);
}

const MAX_STRETCH = 1.15;

/** A moving drop of glass stretches along its direction of travel and thins across it. */
export function stretch(vx: number, vy: number, k: number): { angle: number; sx: number; sy: number } {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { angle: 0, sx: 1, sy: 1 };
  const sx = Math.min(MAX_STRETCH, 1 + (k * speed) / 40);
  return { angle: Math.atan2(vy, vx), sx, sy: 1 / sx };
}
