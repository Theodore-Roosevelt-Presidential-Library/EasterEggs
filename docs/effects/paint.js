// Painterly building blocks: seeded noise, paper grain, a generative Badlands landscape,
// small silhouettes that live in it, and big brand type bands.
import { C, rand } from './lib.js';

// ---------- noise ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function noise(seed) {
  const r = rng(seed), p = Array.from({ length: 512 }, r);
  return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const a = p[i & 511], b = p[(i + 1) & 511]; return a + (b - a) * u; };
}
export const fbm = (n, x, oct = 4) => { let s = 0, a = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f + i * 17.3); norm += a; a *= 0.5; f *= 2.03; } return s / norm; };
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ---------- paper grain ----------
let grainCanvas = null;
export function grain() {
  if (grainCanvas) return grainCanvas;
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'), img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 46;
  }
  g.putImageData(img, 0, 0);
  return (grainCanvas = c);
}
// Textures whatever is already painted on g (and nothing else).
export function applyGrain(g, w, h, alpha = 1) {
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, w, h); g.restore();
}
let grainURL = null;
export function grainDataURL() { return grainURL || (grainURL = grain().toDataURL()); }

// ---------- palettes ----------
const SKIES = {
  day:   { haze: '#E7ECEF', far: '#B9C6D2', glow: null },
  dawn:  { haze: '#F6D9C8', far: '#C9B3B8', glow: C.pink },
  dusk:  { haze: '#F2B48C', far: '#8E8FA6', glow: C.sunset },
  night: { haze: '#24425F', far: '#1A3550', glow: null }
};
const STRATA = ['#E3C9A8', '#D9895F', '#C8643B', '#EAD9C0', '#B8826A', '#E7805D', '#D1CCBD', '#9C4A2D', '#E9B98F'];

// A landscape painted once into its own canvas, w x h CSS pixels.
// kind: badlands | canyon | tower | forest | prairie | river | sea.  time: day | dawn | dusk | night.
// Returns { cv, ground: Float32Array of the walkable ground line (y per x), water: y or null }.
export function landscape(w, h, kind = 'badlands', time = 'day', seed = Math.floor(Math.random() * 1e9)) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = SKIES[time] || SKIES.day, n = noise(seed), n2 = noise(seed + 7), n3 = noise(seed + 13);
  const night = time === 'night';
  const ground = new Float32Array(Math.ceil(w) + 1);
  let water = null;

  // Far ridge.
  ridge(g, w, h, (x) => h * 0.42 + fbm(n3, x / 260) * h * 0.22, sky.far);

  if (kind === 'forest') {
    const layers = night ? ['#1E3A4A', '#183326', '#0F2219'] : ['#9DB3A6', '#4E7A5E', C.forest];
    layers.forEach((col, i) => trees(g, w, h, h * (0.52 + i * 0.16), 22 + i * 16, col, seed + i));
    fillGround(ground, (x) => h * 0.9);
  } else if (kind === 'bottomland') {
    // The Little Sunflower River bottoms in November 1902: oak, ash and cypress, the woods
    // "choked" with undergrowth and canebrake, and a slough of standing water.
    const layers = [['#C2B7A8', '#CDBFA8'], ['#8E6A45', '#A0703F', '#7A6A55'], ['#7A4A2D', '#94643A', '#5E5240']];
    layers.forEach((cols, i) => {
      const base = h * (0.52 + i * 0.13), r = 16 + i * 10;
      for (let x = -20; x < w + 20; x += r * rand(0.7, 1.1)) {
        const y = base + (n2(x / 120 + i * 5) - 0.5) * r;
        if (Math.random() < 0.45) { g.strokeStyle = `rgba(78,68,56,${0.35 + i * 0.2})`; g.lineWidth = 1 + i; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-4, 4), y + (h - y) * rand(0.5, 0.8)); g.stroke(); }
        g.fillStyle = cols[Math.floor(rand(0, cols.length))];
        for (let k = 0; k < 4; k++) blob(g, x + rand(-r, r) * 0.5, y - r * rand(0.6, 1.4), r * rand(0.55, 0.9));
      }
    });
    // slough
    const sy = h * 0.86;
    const sg = g.createLinearGradient(0, sy, 0, h); sg.addColorStop(0, '#7E8A86'); sg.addColorStop(1, '#4E5A55');
    g.fillStyle = sg; g.beginPath(); g.ellipse(w * 0.62, sy + 10, w * 0.22, 16, 0, 0, 7); g.fill();
    // cane and tangled undergrowth across the lower third
    for (let x = 0; x < w; x += rand(2, 5)) {
      if (Math.abs(x - w * 0.62) < w * 0.18 && Math.random() < 0.7) continue;
      const hh = rand(h * 0.12, h * 0.32), lean = rand(-6, 6);
      g.strokeStyle = Math.random() < 0.5 ? '#6E7A3E' : '#8A8A4A'; g.lineWidth = rand(1, 2.2);
      g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean / 2, h - hh / 2, x + lean, h - hh); g.stroke();
      if (Math.random() < 0.25) { g.beginPath(); g.moveTo(x + lean, h - hh); g.lineTo(x + lean + rand(6, 14), h - hh + rand(2, 8)); g.stroke(); }
    }
    g.strokeStyle = 'rgba(70,60,40,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 60; i++) { const x = rand(0, w), y = rand(h * 0.7, h); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + rand(-30, 30), y - rand(10, 30), x + rand(-30, 30), y - rand(0, 20), x + rand(-40, 40), y); g.stroke(); } // vines
    fillGround(ground, () => h * 0.92);
  } else if (kind === 'hills') {
    // Santiago, July 1, 1898: a distant mountain line, open grassy hills, palms down in the valley.
    ridge(g, w, h, (x) => h * 0.3 + fbm(n3, x / 160 + 4) * h * 0.18, '#A9B8C2'); // the mountains around the Santiago plain
    const greens = ['#8FB89A', '#6FA068', '#4E8A4E'];
    greens.forEach((col, i) => {
      const f = (x) => h * (0.46 + i * 0.12) - Math.max(0, Math.sin(x / (w * 0.22) + i * 1.7)) * h * (0.14 - i * 0.03) + (fbm(n2, x / 90 + i * 9) - 0.5) * h * 0.03;
      g.fillStyle = col; g.fill(shape(w, h, f));
    });
    // valley floor: low jungle with scattered palms towering above it
    const vf = (x) => h * 0.84 + (fbm(n, x / 70) - 0.5) * h * 0.06;
    g.fillStyle = '#2E5E3E'; g.fill(shape(w, h, vf));
    g.fillStyle = '#3E7A44'; for (let x = 0; x < w; x += rand(10, 24)) blob(g, x, vf(x) + 2, rand(6, 12));
    for (let x = rand(20, 90); x < w; x += rand(70, 170)) palm(g, x, vf(x) + 4, rand(34, 52), '#244A30');
    fillGround(ground, () => h * 0.95);
  } else if (kind === 'sea') {
    ridge(g, w, h, (x) => h * 0.55 + fbm(n, x / 200) * h * 0.18, night ? '#183326' : '#5E8A63');
    water = h * 0.72;
    const sea = g.createLinearGradient(0, water, 0, h);
    sea.addColorStop(0, night ? '#1C3B5A' : '#7FA7C4'); sea.addColorStop(1, night ? '#0C2238' : C.night);
    g.fillStyle = sea; g.fillRect(0, water, w, h - water);
    g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const y = water + Math.pow(Math.random(), 1.6) * (h - water), x = Math.random() * w, l = 8 + Math.random() * 30 * (y - water) / (h - water); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
    g.globalAlpha = 1;
    fillGround(ground, () => water + 4);
  } else {
    // Badlands buttes: flat tops where the noise runs high, banded with strata and a coal seam.
    const deep = kind === 'canyon';
    const top = (x) => {
      const v = fbm(n, x / (deep ? 420 : 260));
      let y = h * (deep ? 0.34 : 0.66)
        - smooth(0.36, 0.56, v) * h * (deep ? 0.14 : 0.32)                 // flat-topped buttes
        - Math.max(0, fbm(n2, x / 85 + 3) - 0.55) * h * (deep ? 0.2 : 0.9)   // eroded cones
        + (fbm(n2, x / 40) - 0.5) * h * 0.035;                               // ragged edges
      if (deep) { // a stepped gorge: terraces cut down toward the river
        const d = Math.abs(x - w * 0.5 + (fbm(n3, x / 300) - 0.5) * w * 0.1) / (w * 0.2);
        const depth = Math.max(0, 1 - d), steps = 5;
        const k = Math.floor(depth * steps) / steps + smooth(0, 1, (depth * steps) % 1) / steps * 0.5;
        y += k * h * 0.56;
      }
      return y;
    };
    const path = shape(w, h, top);
    g.save(); g.clip(path);
    // Horizontal strata of uneven thickness, from above the highest top to the bottom.
    let yy = h * 0.08, i = 0;
    while (yy < h) {
      const th = (deep ? 7 : 6) + rand(0, 1) * (i % 3 === 0 ? 16 : 9);
      g.fillStyle = night ? shade(STRATA[i % STRATA.length], -0.62) : STRATA[(i + (seed % 5)) % STRATA.length];
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, yy + (fbm(n2, x / 160 + i * 3.1) - 0.5) * 8);
      g.lineTo(w, h); g.closePath(); g.fill();
      if (i % 7 === 4) { // lignite: the thin black seams that run through the North Dakota badlands
        g.strokeStyle = night ? '#0B0F14' : '#3A332E'; g.lineWidth = rand(1.5, 3); g.globalAlpha = 0.8; g.beginPath();
        for (let x = 0; x <= w; x += 6) g.lineTo(x, yy + 2 + (fbm(n2, x / 160 + i * 3.1) - 0.5) * 8);
        g.stroke(); g.globalAlpha = 1;
      }
      yy += th; i++;
    }
    // Light from the left: slopes that fall away to the right sit in shadow.
    for (let x = 0; x < w; x += 2) {
      const sl = (top(x + 3) - top(x - 3)) / 6;
      if (sl > 0.15) { g.fillStyle = `rgba(70,35,30,${Math.min(0.32, sl * 0.18)})`; g.fillRect(x, top(x), 2, h); }
      else if (sl < -0.25) { g.fillStyle = `rgba(255,235,200,${Math.min(0.2, -sl * 0.1)})`; g.fillRect(x, top(x), 2, h * 0.4); }
    }
    // Rills: fine vertical erosion streaks, and shade toward the base.
    g.globalAlpha = night ? 0.15 : 0.22; g.strokeStyle = '#6E3A26'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 3 + Math.random() * 4) { const y = top(x); g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + rand(-2, 2), y + rand(10, h * 0.25)); g.stroke(); }
    g.globalAlpha = 1;
    const sh = g.createLinearGradient(0, h * 0.35, 0, h); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, night ? 'rgba(0,0,0,.4)' : 'rgba(80,40,20,.28)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.restore();
    if (deep) { // the river at the bottom of the canyon
      g.fillStyle = night ? '#1C3B5A' : C.sky; g.beginPath();
      g.ellipse(w * 0.5, h * 0.93, w * 0.06, h * 0.03, 0, 0, Math.PI * 2); g.fill();
    }

    if (kind === 'tower') tower(g, w, h, night);

    // Near rolling grassland with sage and juniper.
    const near = (x) => h * (kind === 'prairie' ? 0.74 : 0.8) + (fbm(n3, x / 220 + 40) - 0.5) * h * 0.12;
    const grass = g.createLinearGradient(0, h * 0.7, 0, h);
    grass.addColorStop(0, night ? '#2B4A33' : '#9DBF7E'); grass.addColorStop(1, night ? '#13281C' : '#4E7A43');
    g.fillStyle = grass; g.fill(shape(w, h, near));
    g.fillStyle = night ? '#0F2219' : '#2E5E3E';
    for (let x = 0; x < w; x += rand(18, 70)) { const y = near(x); blob(g, x, y + rand(3, 14), rand(3, 7)); }
    if (kind !== 'prairie') tufts(g, w, near, night ? '#1E3A28' : '#6E9A55');
    fillGround(ground, near);

    if (kind === 'river') {
      water = h * 0.86;
      const rv = new Path2D(); rv.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) rv.lineTo(x, water + (fbm(n, x / 300 + 9) - 0.5) * 10);
      rv.lineTo(w, h); rv.closePath();
      const wg = g.createLinearGradient(0, water, 0, h); wg.addColorStop(0, night ? '#2B4F72' : '#A9C2D6'); wg.addColorStop(1, night ? '#123049' : '#5B8DB8');
      g.fillStyle = wg; g.fill(rv);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
      for (let i = 0; i < 50; i++) { const x = Math.random() * w, y = water + 6 + Math.random() * (h - water - 6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(6, 26), y); g.stroke(); }
      fillGround(ground, () => water + 5);
    }
  }
  applyGrain(g, w, h, 0.9);
  // Haze behind the hills, fading to nothing at the top so the band sits on the page. Painted
  // behind the land after the grain, so the sky stays clean.
  g.save(); g.globalCompositeOperation = 'destination-over';
  if (sky.glow) { const gl = g.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.55); gl.addColorStop(0, hexA(sky.glow, 0.4)); gl.addColorStop(1, hexA(sky.glow, 0)); g.fillStyle = gl; g.fillRect(0, 0, w, h); }
  const sk = g.createLinearGradient(0, 0, 0, h);
  sk.addColorStop(0, 'rgba(255,255,255,0)'); sk.addColorStop(0.4, hexA(sky.haze, 0.6)); sk.addColorStop(0.75, sky.haze);
  g.fillStyle = sk; g.fillRect(0, 0, w, h);
  g.restore();
  return { cv, ground, water, w, h };

  function fillGround(arr, f) { for (let x = 0; x < arr.length; x++) arr[x] = f(x); }
}

function shape(w, h, f) {
  const p = new Path2D(); p.moveTo(0, h);
  for (let x = 0; x <= w + 4; x += 4) p.lineTo(x, f(x));
  p.lineTo(w, h); p.closePath(); return p;
}
function ridge(g, w, h, f, col) { g.fillStyle = col; g.fill(shape(w, h, f)); }
function blob(g, x, y, r) { g.beginPath(); for (let a = 0; a < 6.3; a += 0.7) g.lineTo(x + Math.cos(a) * r * rand(0.7, 1.2), y + Math.sin(a) * r * rand(0.6, 1)); g.fill(); }
function tufts(g, w, f, col) {
  g.strokeStyle = col; g.lineWidth = 1.2;
  for (let x = 0; x < w; x += rand(2, 6)) { const y = f(x); g.beginPath(); g.moveTo(x, y + 1); g.quadraticCurveTo(x + rand(-2, 2), y - 3, x + rand(-3, 3), y - rand(3, 8)); g.stroke(); }
}
function trees(g, w, h, base, size, col, seed) {
  const n = noise(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
  for (let x = -10; x < w + 20; x += size * rand(0.55, 0.95)) {
    const hh = size * (1.1 + n(x / 90) * 1.1) * rand(0.8, 1.2), y = base + (n(x / 300 + 5) - 0.5) * size;
    const bw = size * rand(0.5, 0.62);
    g.lineTo(x - bw, y); // a ponderosa-like pine: drooping tiers with ragged tips
    for (let t = 0; t < 5; t++) { const k = t / 5; g.lineTo(x - bw * (1 - k) * rand(0.9, 1.1), y - hh * k + 2); g.lineTo(x - bw * (1 - k) * 0.45, y - hh * (k + 0.1)); }
    g.lineTo(x, y - hh);
    for (let t = 4; t >= 0; t--) { const k = t / 5; g.lineTo(x + bw * (1 - k) * 0.45, y - hh * (k + 0.1)); g.lineTo(x + bw * (1 - k) * rand(0.9, 1.1), y - hh * k + 2); }
    g.lineTo(x + bw, y);
  }
  g.lineTo(w, h); g.closePath(); g.fill();
}
function tower(g, w, h, night) {
  const cx = w * 0.64, base = h * 0.78, top = h * 0.08, bw = Math.min(150, w * 0.12), tw = bw * 0.62;
  const p = new Path2D();
  p.moveTo(cx - bw * 1.9, base + 6); p.quadraticCurveTo(cx - bw * 1.2, base - h * 0.08, cx - bw, base - h * 0.12);
  p.lineTo(cx - tw, top + 10); p.quadraticCurveTo(cx - tw * 0.2, top - 6, cx + tw, top + 6);
  p.lineTo(cx + bw, base - h * 0.12); p.quadraticCurveTo(cx + bw * 1.3, base - h * 0.06, cx + bw * 2, base + 6); p.closePath();
  const lit = g.createLinearGradient(cx - bw, 0, cx + bw, 0);
  lit.addColorStop(0, night ? '#4A3A33' : '#E2A06E'); lit.addColorStop(0.55, night ? '#3A2D28' : '#B0714A'); lit.addColorStop(1, night ? '#241B18' : '#7D4A31');
  g.fillStyle = lit; g.fill(p);
  g.save(); g.clip(p); g.globalAlpha = 0.35; g.strokeStyle = night ? '#120D0B' : '#5E3420';
  for (let i = -9; i <= 9; i++) { // columns
    const xb = cx + (i / 9) * bw, xt = cx + (i / 9) * tw; g.lineWidth = rand(0.8, 2.2);
    g.beginPath(); g.moveTo(xt + rand(-2, 2), top); g.bezierCurveTo(xt + rand(-3, 3), h * 0.35, xb + rand(-3, 3), h * 0.55, xb, base); g.stroke();
  }
  g.restore();
  // talus and ponderosa skirt
  g.fillStyle = night ? '#0F2219' : '#2E5E3E';
  for (let x = cx - bw * 2.4; x < cx + bw * 2.4; x += rand(5, 12)) { const y = base - h * 0.04 + Math.abs(x - cx) / (bw * 2.4) * h * 0.08; g.beginPath(); g.moveTo(x - 6, y + 10); g.lineTo(x, y - rand(10, 22)); g.lineTo(x + 6, y + 10); g.fill(); }
}

// ---------- tiny silhouettes, drawn every frame. Origin at the feet, facing right, s = height ----------
const INK = '#2A221D';
export function bison(g, x, y, s, ph, col = INK) {
  g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
  const leg = (lx, o) => { g.lineWidth = s * 0.11; g.beginPath(); g.moveTo(lx, -s * 0.38); g.lineTo(lx + Math.sin(ph + o) * s * 0.12, 0); g.stroke(); };
  leg(-s * 0.42, 0); leg(s * 0.3, Math.PI); leg(-s * 0.3, Math.PI); leg(s * 0.42, 0);
  g.beginPath(); g.ellipse(-s * 0.1, -s * 0.5, s * 0.52, s * 0.22, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.28, -s * 0.62, s * 0.32, s * 0.34, -0.2, 0, 7); g.fill(); // hump
  g.beginPath(); g.ellipse(s * 0.62, -s * 0.38, s * 0.16, s * 0.2, 0.5, 0, 7); g.fill(); // head, low
  g.beginPath(); g.moveTo(s * 0.55, -s * 0.28); g.lineTo(s * 0.62, -s * 0.08); g.lineTo(s * 0.7, -s * 0.26); g.fill(); // beard
  g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(-s * 0.6, -s * 0.55); g.quadraticCurveTo(-s * 0.72, -s * 0.4, -s * 0.66, -s * 0.28); g.stroke(); // tail
  g.restore();
}
export function pronghorn(g, x, y, s, ph) {
  g.save(); g.translate(x, y); g.lineCap = 'round';
  g.strokeStyle = '#6E5236'; g.lineWidth = s * 0.06;
  [[-s * 0.32, 0], [s * 0.28, Math.PI], [-s * 0.22, Math.PI], [s * 0.36, 0]].forEach(([lx, o]) => { g.beginPath(); g.moveTo(lx, -s * 0.42); g.lineTo(lx + Math.sin(ph * 1.6 + o) * s * 0.2, 0); g.stroke(); });
  g.fillStyle = '#B98E62'; g.beginPath(); g.ellipse(0, -s * 0.52, s * 0.42, s * 0.16, 0, 0, 7); g.fill();
  g.fillStyle = '#F2E8D8'; g.beginPath(); g.ellipse(-s * 0.36, -s * 0.52, s * 0.08, s * 0.12, 0, 0, 7); g.fill();
  g.strokeStyle = '#B98E62'; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(s * 0.3, -s * 0.6); g.lineTo(s * 0.48, -s * 0.9); g.stroke();
  g.fillStyle = '#B98E62'; g.beginPath(); g.ellipse(s * 0.55, -s * 0.92, s * 0.12, s * 0.07, 0.3, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(s * 0.47, -s * 0.98); g.lineTo(s * 0.45, -s * 1.12); g.stroke();
  g.restore();
}
function palm(g, x, y, s, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
  g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.05, y - s); g.stroke();
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55, tx = x + s * 0.05 + Math.cos(a) * s * 0.55, ty = y - s + Math.sin(a) * s * 0.35 + s * 0.12;
    g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(x + s * 0.05, y - s); g.quadraticCurveTo((x + tx) / 2, y - s * 1.12, tx, ty); g.stroke();
  }
}

// A wild horse, mane and tail moving with its gait.
export function horse(g, x, y, s, ph, col = '#4A3324') {
  g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
  [[-s * 0.32, 0], [s * 0.3, Math.PI], [-s * 0.22, Math.PI], [s * 0.38, 0]].forEach(([lx, o]) => {
    g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(lx, -s * 0.45); g.lineTo(lx + Math.sin(ph + o) * s * 0.16, -s * 0.16); g.lineTo(lx + Math.sin(ph + o) * s * 0.2, 0); g.stroke();
  });
  g.beginPath(); g.ellipse(0, -s * 0.55, s * 0.42, s * 0.17, 0, 0, 7); g.fill();
  g.lineWidth = s * 0.15; g.beginPath(); g.moveTo(s * 0.32, -s * 0.62); g.lineTo(s * 0.5, -s * 0.92); g.stroke(); // neck
  g.beginPath(); g.ellipse(s * 0.6, -s * 0.9, s * 0.15, s * 0.07, 0.6, 0, 7); g.fill(); // head
  g.strokeStyle = '#2A1E16'; g.lineWidth = s * 0.05;
  g.beginPath(); g.moveTo(s * 0.48, -s * 0.98); g.quadraticCurveTo(s * 0.32, -s * 0.8 + Math.sin(ph) * s * 0.03, s * 0.28, -s * 0.66); g.stroke(); // mane
  g.beginPath(); g.moveTo(-s * 0.4, -s * 0.6); g.quadraticCurveTo(-s * 0.6, -s * 0.5 + Math.sin(ph * 1.3) * s * 0.06, -s * 0.55, -s * 0.25); g.stroke(); // tail
  g.restore();
}

export function hiker(g, x, y, s, ph) {
  g.save(); g.translate(x, y); g.strokeStyle = INK; g.fillStyle = INK; g.lineCap = 'round'; g.lineWidth = s * 0.09;
  const sw = Math.sin(ph) * s * 0.16;
  g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(sw, 0); g.moveTo(0, -s * 0.45); g.lineTo(-sw, 0); g.stroke();
  g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(s * 0.02, -s * 0.8); g.stroke();
  g.beginPath(); g.ellipse(-s * 0.1, -s * 0.66, s * 0.1, s * 0.15, 0, 0, 7); g.fill(); // pack
  g.beginPath(); g.arc(s * 0.03, -s * 0.9, s * 0.08, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.03, -s * 0.95, s * 0.16, s * 0.03, 0, 0, 7); g.fill(); // hat brim
  g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(s * 0.04, -s * 0.7); g.lineTo(s * 0.22 + sw * 0.4, 0); g.stroke(); // stick
  g.restore();
}
export function train(g, x, y, s) {
  g.save(); g.translate(x, y); g.fillStyle = INK;
  for (let c = 0; c < 3; c++) { g.fillRect(-s * (3.6 - c * 1.05), -s * 0.62, s * 0.95, s * 0.48); }
  g.fillRect(-s * 0.4, -s * 0.8, s * 0.42, s * 0.66); // cab
  g.beginPath(); g.ellipse(s * 0.45, -s * 0.36, s * 0.48, s * 0.2, 0, 0, 7); g.fill(); // boiler
  g.beginPath(); g.moveTo(s * 0.62, -s * 0.5); g.lineTo(s * 0.54, -s * 0.95); g.lineTo(s * 0.84, -s * 0.95); g.lineTo(s * 0.74, -s * 0.5); g.fill(); // balloon stack
  g.beginPath(); g.moveTo(s * 0.85, -s * 0.2); g.lineTo(s * 1.1, -s * 0.02); g.lineTo(s * 0.85, -s * 0.02); g.fill(); // pilot
  g.fillRect(-s * 3.7, -s * 0.12, s * 4.6, s * 0.06);
  g.restore();
  return { x: x + s * 0.69, y: y - s * 0.95 }; // stack top, for steam
}
export function ship(g, x, y, s) {
  g.save(); g.translate(x, y); g.fillStyle = INK;
  g.beginPath(); g.moveTo(-s * 1.6, -s * 0.3); g.lineTo(s * 1.7, -s * 0.3); g.lineTo(s * 1.4, 0); g.lineTo(-s * 1.4, 0); g.fill();
  g.fillRect(-s * 1.0, -s * 0.5, s * 1.9, s * 0.22);
  g.fillRect(-s * 0.35, -s * 1.0, s * 0.22, s * 0.52); g.fillRect(s * 0.15, -s * 0.95, s * 0.22, s * 0.47);
  g.lineWidth = s * 0.04; g.strokeStyle = INK; g.beginPath(); g.moveTo(-s * 1.2, -s * 0.3); g.lineTo(-s * 1.2, -s * 1.2); g.moveTo(s * 1.25, -s * 0.3); g.lineTo(s * 1.25, -s * 1.1); g.stroke();
  g.restore();
  return { x: x - s * 0.24, y: y - s * 1.0 };
}
export function canoe(g, x, y, s, ph) {
  g.save(); g.translate(x, y); g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-s * 1.3, -s * 0.22); g.quadraticCurveTo(0, s * 0.18, s * 1.3, -s * 0.22); g.quadraticCurveTo(0, -s * 0.02, -s * 1.3, -s * 0.22); g.fill();
  [-0.5, 0.45].forEach((px, i) => {
    g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(s * px, -s * 0.15); g.lineTo(s * px, -s * 0.55); g.stroke();
    g.beginPath(); g.arc(s * px, -s * 0.65, s * 0.09, 0, 7); g.fill();
    const a = Math.sin(ph + i) * 0.7; g.lineWidth = s * 0.04; g.beginPath();
    g.moveTo(s * px + Math.cos(a + 2) * s * 0.4, -s * 0.45 + Math.sin(a + 2) * s * 0.4); g.lineTo(s * px - Math.cos(a + 2) * s * 0.35, -s * 0.45 - Math.sin(a + 2) * s * 0.5); g.stroke();
  });
  g.restore();
}

// Soft steam/smoke puffs that rise, drift and fade.
export function puffs() {
  const list = [];
  return {
    add(x, y, warm) { list.push({ x, y, r: rand(3, 6), vx: rand(-14, -4), vy: rand(-26, -14), life: 1, warm }); },
    draw(g, dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 9 * dt; p.vy *= 1 - dt * 0.6; p.life -= dt * 0.38;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        gr.addColorStop(0, `rgba(${p.warm ? '120,110,105' : '255,255,255'},${0.55 * p.life})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
      }
    }
  };
}

// ---------- brand type bands ----------
// Layered color blocks of Dharma Gothic that slide in from alternating sides, like the brand posters.
const COMBOS = [[C.forest, C.yellow], [C.night, C.pink], [C.orange, C.night], [C.sand, C.forest], [C.yellow, C.forest], [C.night, C.bright], [C.pink, C.night], [C.forest, C.bright]];
export async function typeBands(s, lines, opts = {}) {
  const style = document.createElement('style');
  style.textContent = `
  .bands{position:absolute;z-index:20;left:0;right:0;top:${opts.top || '30%'};display:flex;flex-direction:column;align-items:center;gap:.06em;
    font:700 clamp(54px,11vw,170px)/.84 "Dharma Gothic E",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.005em;
    transform:translateY(-50%) rotate(-4deg)}
  .band{position:relative;padding:.06em .22em .02em;white-space:nowrap;box-shadow:0 18px 40px rgba(9,42,77,.18)}
  .band::after{content:"";position:absolute;inset:0;background-image:url(${grainDataURL()});mix-blend-mode:multiply;opacity:.5;pointer-events:none}`;
  s.root.appendChild(style);
  const wrap = s.add('', '');
  wrap.className = 'bands';
  // When the message card sits at the top, start the bands just below it so they never overlap.
  const card = s.root.querySelector('.card.top');
  if (card) {
    const below = card.getBoundingClientRect().bottom + 28;
    wrap.style.top = `${Math.max(below, s.vh() * 0.22)}px`;
    wrap.style.transform = 'rotate(-4deg)';
  }
  const offset = Math.floor(Math.random() * COMBOS.length);
  const els = lines.map((t, i) => {
    const [bg, fg] = (opts.combos || COMBOS)[(i + offset) % COMBOS.length];
    const b = document.createElement('div'); b.className = 'band'; b.textContent = t;
    b.style.cssText = `background:${bg};color:${fg};margin-left:${(i % 2 ? 1 : -1) * Math.min(8, lines.length * 2)}vw;transform:translateX(${i % 2 ? '' : '-'}130vw)`;
    wrap.appendChild(b); return b;
  });
  const ins = els.map((b, i) => b.animate([{ transform: `translateX(${i % 2 ? '' : '-'}130vw)` }, { transform: 'translateX(0)' }],
    { duration: 760, delay: i * 130, easing: 'cubic-bezier(.16,.9,.2,1.04)', fill: 'forwards' }).finished);
  await Promise.all(ins);
  await new Promise((r) => setTimeout(r, opts.hold || 2600));
  const outs = els.map((b, i) => b.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${i % 2 ? '-' : ''}130vw)`, opacity: 1 }],
    { duration: 620, delay: i * 90, easing: 'cubic-bezier(.6,0,.8,.3)', fill: 'forwards' }).finished);
  await Promise.all(outs);
  wrap.remove();
}

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(Math.max(0, Math.min(255, v + v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
