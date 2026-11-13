import { feel } from '../lib/feel';
import { cloneOffset, rimBend, stretch } from '../lib/lens';

const SIZE = feel.lensDiameterPx;
const RADIUS = SIZE / 2;
const MIRRORED = ['data-lit', 'data-visited'];

let lens: HTMLElement | null = null;
let stretcher: HTMLElement;
let view: HTMLElement;
let bender: HTMLElement;
let copy: HTMLElement | null = null;
let page: HTMLElement | null = null;
let observer: MutationObserver | null = null;

const target = { x: 0, y: 0 };
const pos = { x: 0, y: 0 };
const vel = { x: 0, y: 0 };
let on = false;
let pressed = false;
let frame = 0;
let listening = false;

const wanted = () =>
  matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Safari renders this SVG filter unreliably, so it gets the glass without the rim bending. */
const canBend = () => !/Apple/.test(navigator.vendor);

/**
 * The bend is a displacement map: each pixel's red and green say how far, and
 * which way, the glass shifts what you see there. The middle is neutral grey
 * (no shift); the rim pulls the image in towards the centre.
 */
function bendMaps(): { map: string; rim: string } {
  const n = 256;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = n;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx, img: ctx.createImageData(n, n) };
  };
  const map = make();
  const rim = make(); // where the bend happens, used to soften only that band
  const scale = RADIUS / (n / 2);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5 - n / 2) * scale;
      const dy = (y + 0.5 - n / 2) * scale;
      const r = Math.hypot(dx, dy) || 1;
      const bend = rimBend(r, RADIUS, feel.lensRimPx);
      const i = (y * n + x) * 4;
      map.img.data[i] = 128 - (dx / r) * bend * 127;
      map.img.data[i + 1] = 128 - (dy / r) * bend * 127;
      map.img.data[i + 2] = 128;
      map.img.data[i + 3] = 255;
      rim.img.data[i + 3] = Math.min(255, bend * 4 * 255);
    }
  }
  map.ctx.putImageData(map.img, 0, 0);
  rim.ctx.putImageData(rim.img, 0, 0);
  return { map: map.canvas.toDataURL(), rim: rim.canvas.toDataURL() };
}

function bendFilter(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lens-filter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const { map, rim } = bendMaps();
  const box = `x="0" y="0" width="${SIZE}" height="${SIZE}" preserveAspectRatio="none"`;
  // Displacement picks whole pixels, which leaves stair-steps where text is
  // stretched. A hair of blur, in the bent band only, smooths them; the
  // middle of the glass stays perfectly sharp.
  svg.innerHTML = `
    <filter id="lens-bend" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="${map}" ${box} result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${feel.lensRimPx * 0.4}" xChannelSelector="R" yChannelSelector="G" result="bent" />
      <feGaussianBlur in="bent" stdDeviation="0.55" result="soft" />
      <feImage href="${rim}" ${box} result="rim" />
      <feComposite in="soft" in2="rim" operator="in" result="softRim" />
      <feMerge><feMergeNode in="bent" /><feMergeNode in="softRim" /></feMerge>
    </filter>`;
  return svg;
}

function build() {
  lens = document.createElement('div');
  lens.className = 'lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.inert = true;
  lens.innerHTML =
    '<div class="lens-stretch"><div class="lens-body">' +
    '<div class="lens-shadow"></div><div class="lens-view"><div class="lens-bend"></div></div><div class="lens-glass"></div>' +
    '</div></div>';
  stretcher = lens.querySelector('.lens-stretch')!;
  view = lens.querySelector('.lens-view')!;
  bender = lens.querySelector('.lens-bend')!;
  // The filter sits inside the round clip, so bent pixels never spill past the rim.
  if (canBend()) {
    lens.append(bendFilter());
    bender.style.filter = 'url(#lens-bend)';
  }
  document.body.append(lens);
  refreshCopy();
}

/** The glass holds a live copy of the page, so what it magnifies is real, sharp text. */
export function refreshCopy() {
  if (!lens) return;
  page = document.querySelector<HTMLElement>('main.page');
  observer?.disconnect();
  bender.replaceChildren();
  copy = null;
  if (!page) return;

  copy = document.createElement('div');
  copy.className = 'page lens-copy';
  copy.innerHTML = page.innerHTML;
  copy.style.width = `${page.offsetWidth}px`;
  for (const el of copy.querySelectorAll('*')) {
    el.removeAttribute('id');
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('data-astro-transition')) el.removeAttribute(attr.name);
    }
  }
  bender.append(copy);

  // Links light up on the real page; mirror that into the copy.
  const real = [...page.querySelectorAll<HTMLElement>('a, .shine')];
  const twin = [...copy.querySelectorAll<HTMLElement>('a, .shine')];
  observer = new MutationObserver((records) => {
    for (const { target: el, attributeName } of records) {
      const i = real.indexOf(el as HTMLElement);
      if (i < 0 || !attributeName || !twin[i]) continue;
      const value = (el as HTMLElement).getAttribute(attributeName);
      if (value === null) twin[i].removeAttribute(attributeName);
      else twin[i].setAttribute(attributeName, value);
    }
  });
  observer.observe(page, { subtree: true, attributes: true, attributeFilter: MIRRORED });

  // A scrolled list on the page should be scrolled the same inside the glass.
  const boxes = [...page.querySelectorAll<HTMLElement>('.now-scroll')];
  const twins = [...copy.querySelectorAll<HTMLElement>('.now-scroll')];
  boxes.forEach((box, i) => {
    if (!twins[i]) return;
    twins[i].scrollTop = box.scrollTop;
    box.onscroll = () => {
      if (twins[i].isConnected) twins[i].scrollTop = box.scrollTop;
    };
  });

  // Keep the moving colour inside the glass in step with the colour on the page.
  real.forEach((el, i) => {
    const from = el.getAnimations().find((anim) => (anim as CSSAnimation).animationName === 'door-flow');
    const to = twin[i]?.getAnimations().find((anim) => (anim as CSSAnimation).animationName === 'door-flow');
    if (from && to) to.startTime = from.startTime;
  });
}

function show() {
  if (on || pressed) return;
  if (!lens || !lens.isConnected) build();
  on = true;
  pos.x = target.x;
  pos.y = target.y;
  vel.x = vel.y = 0;
  lens!.setAttribute('data-on', '');
  document.documentElement.setAttribute('data-lens', '');
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(tick);
}

function hide() {
  if (!on) return;
  on = false;
  lens?.removeAttribute('data-on');
  document.documentElement.removeAttribute('data-lens');
}

function tick() {
  if (!on || !lens) return;
  // Ease towards the cursor: a drop of glass has a little weight.
  const nx = pos.x + (target.x - pos.x) * feel.lensFollow;
  const ny = pos.y + (target.y - pos.y) * feel.lensFollow;
  vel.x += (nx - pos.x - vel.x) * 0.35;
  vel.y += (ny - pos.y - vel.y) * 0.35;
  pos.x = nx;
  pos.y = ny;

  lens.style.transform = `translate3d(${pos.x - RADIUS}px, ${pos.y - RADIUS}px, 0)`;
  const s = stretch(vel.x, vel.y, feel.lensStretch);
  stretcher.style.transform =
    s.sx - 1 < 0.002 ? '' : `rotate(${s.angle}rad) scale(${s.sx}, ${s.sy}) rotate(${-s.angle}rad)`;

  if (copy && page) {
    const rect = page.getBoundingClientRect();
    const o = cloneOffset(pos.x - rect.left, pos.y - rect.top, feel.lensZoom, RADIUS);
    copy.style.transform = `translate(${o.x}px, ${o.y}px) scale(${feel.lensZoom})`;
  }
  frame = requestAnimationFrame(tick);
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !wanted()) return;
      // A release can go missing (a context menu swallows it); no button held means not pressed.
      if (e.buttons === 0) pressed = false;
      target.x = e.clientX;
      target.y = e.clientY;
      show();
    },
    { passive: true },
  );
  // Step aside while the reader drags to select text.
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pressed = true;
    hide();
  });
  document.addEventListener('pointerup', () => {
    pressed = false;
  });
  document.documentElement.addEventListener('mouseleave', hide);
  window.addEventListener('blur', hide);
  window.addEventListener('resize', refreshCopy);
  document.fonts?.ready.then(refreshCopy);
}

/** Call on every page load. The glass itself is only built once the mouse moves. */
export function initLens() {
  if (!wanted()) return;
  listen();
  if (lens && !lens.isConnected) {
    lens = null;
    on = false;
    document.documentElement.removeAttribute('data-lens');
  }
  refreshCopy();
}
