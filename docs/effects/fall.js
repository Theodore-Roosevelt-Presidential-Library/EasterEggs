// Things drifting down with depth: near ones large, soft and quick; far ones small and slow.
// options: { kind: "snow" | "leaves" | "pages", palette: "autumn" | "spring" }
import { play, C, rand, pick } from './lib.js';

const PALETTES = {
  autumn: [['#E7805D', '#B5552F'], ['#FC924E', '#C9622F'], ['#F9D635', '#C9A21F'], ['#C9862F', '#8E5A1E'], ['#9C4A2D', '#6B2E1B']],
  spring: [['#87BB41', '#4E7A2E'], ['#8FC895', '#4F8A58'], ['#B7D86B', '#6E9A35']]
};

// A cottonwood leaf: broad, heart-based, toothed, with a midrib. Drawn once per color into a sprite.
function leafSprite(fill, edge) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.translate(32, 34);
  const gr = g.createLinearGradient(-20, -20, 20, 20); gr.addColorStop(0, fill); gr.addColorStop(1, edge);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 22);
  for (let a = 0; a <= Math.PI; a += Math.PI / 14) {
    const r = 18 * (1 - 0.25 * Math.sin(a * 2)) + (Math.round(a * 14 / Math.PI) % 2 ? 1.6 : 0);
    g.lineTo(-Math.sin(a) * r * 1.05, -Math.cos(a) * r * 1.15 + 2);
  }
  for (let a = Math.PI; a >= 0; a -= Math.PI / 14) {
    const r = 18 * (1 - 0.25 * Math.sin(a * 2)) + (Math.round(a * 14 / Math.PI) % 2 ? 1.6 : 0);
    g.lineTo(Math.sin(a) * r * 1.05, -Math.cos(a) * r * 1.15 + 2);
  }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, -16); g.stroke();
  g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, 6 - i * 8); g.lineTo(-10 + i * 2, -2 - i * 8); g.moveTo(0, 6 - i * 8); g.lineTo(10 - i * 2, -2 - i * 8); g.stroke(); }
  return c;
}
// A snow crystal: six arms, each with a few pairs of branches, white with a soft cool shadow
// so it reads on a white page. Each variant has its own branch pattern.
function crystalSprite(v) {
  const c = document.createElement('canvas'); c.width = c.height = 72;
  const g = c.getContext('2d'); g.translate(36, 36);
  const r = rng(v * 977 + 13);
  const arm = 26, branches = Array.from({ length: 2 + (v % 3) }, (_, i) => ({ at: 0.3 + i * 0.22 + r() * 0.08, len: (0.22 + r() * 0.25) * arm * (1 - i * 0.18), ang: 0.85 + r() * 0.35 }));
  const tip = v % 2 ? 'plate' : 'needle';
  const draw = () => {
    for (let k = 0; k < 6; k++) {
      g.save(); g.rotate(k * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -arm);
      for (const b of branches) {
        const y = -arm * b.at;
        g.moveTo(0, y); g.lineTo(-Math.sin(b.ang) * b.len, y - Math.cos(b.ang) * b.len);
        g.moveTo(0, y); g.lineTo(Math.sin(b.ang) * b.len, y - Math.cos(b.ang) * b.len);
      }
      g.stroke();
      if (tip === 'plate') { g.beginPath(); g.moveTo(0, -arm - 3); g.lineTo(2.6, -arm + 1); g.lineTo(0, -arm + 4); g.lineTo(-2.6, -arm + 1); g.closePath(); g.fill(); }
      g.restore();
    }
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(Math.sin(a) * 5, -Math.cos(a) * 5); } g.closePath(); g.fill();
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(9,42,77,.45)'; g.shadowBlur = 3;
  g.strokeStyle = '#B8C8DA'; g.fillStyle = '#B8C8DA'; g.lineWidth = 3.4; draw(); // cool edge
  g.shadowColor = 'transparent';
  g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = 1.8; draw(); // bright core
  return c;
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function pageSprite() {
  const c = document.createElement('canvas'); c.width = 48; c.height = 62;
  const g = c.getContext('2d'); g.fillStyle = '#FBF7EE'; g.fillRect(2, 2, 44, 58);
  g.strokeStyle = 'rgba(37,40,42,.12)'; g.strokeRect(2.5, 2.5, 43, 57);
  g.fillStyle = 'rgba(37,40,42,.35)';
  for (let y = 10; y < 54; y += 5) g.fillRect(7, y, rand(24, 34), 1.4);
  return c;
}

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const { g, w, h } = s.canvas();
  const o = egg.options || {};
  const kind = o.kind || 'leaves';
  const sprites = kind === 'leaves' ? (PALETTES[o.palette] || PALETTES.autumn).map(([a, b]) => leafSprite(a, b))
    : kind === 'pages' ? [pageSprite(), pageSprite(), pageSprite()]
    : kind === 'snow' ? [0, 1, 2, 3, 4, 5].map(crystalSprite) : null;
  const n = kind === 'snow' ? Math.round(Math.min(220, w / 6)) : kind === 'pages' ? 26 : Math.round(Math.min(70, w / 20));
  const ps = Array.from({ length: n }, () => {
    const z = Math.pow(Math.random(), 1.7); // 0 far .. 1 near
    return { x: rand(-40, w + 40), y: rand(-h * 1.1, -20), z, sp: pick(sprites || [0]), ph: rand(0, 6.28), r: rand(0, 6.28), vr: rand(-1.5, 1.5) };
  });
  ps.sort((a, b) => a.z - b.z);

  await s.loop(10, (t, dt) => {
    g.clearRect(0, 0, w, h);
    const fade = t > 8.4 ? Math.max(0, 1 - (t - 8.4) / 1.6) : 1;
    for (const p of ps) {
      const fallSp = kind === 'snow' ? 30 + p.z * 70 : kind === 'pages' ? 55 + p.z * 50 : 50 + p.z * 70;
      p.ph += dt * (kind === 'snow' ? 0.9 : 1.7);
      p.y += fallSp * dt; p.r += p.vr * dt;
      const sway = Math.sin(p.ph) * (kind === 'snow' ? 18 : 46) * (0.5 + p.z);
      const x = p.x + sway;
      if (p.y > h + 60) continue;
      if (kind === 'snow') {
        if (p.z < 0.35) { // distant flecks: tiny, soft, no outline
          g.fillStyle = `rgba(160,180,202,${0.55 * fade})`;
          g.beginPath(); g.arc(x, p.y, 0.8 + p.z * 3, 0, 7); g.fill();
        } else { // nearer flakes: six-armed crystals, turning slowly
          const size = 8 + (p.z - 0.35) * 30;
          g.save(); g.globalAlpha = fade * (0.6 + 0.4 * p.z); g.translate(x, p.y); g.rotate(p.r * 0.25);
          g.drawImage(p.sp, -size / 2, -size / 2, size, size);
          g.restore();
        }
      } else {
        const size = (kind === 'pages' ? 22 : 18) + p.z * (kind === 'pages' ? 26 : 22);
        const flip = Math.cos(p.ph * 1.3); // tumbling: the sprite narrows as it turns edge-on
        g.save(); g.globalAlpha = fade * (0.55 + 0.45 * p.z); g.translate(x, p.y); g.rotate(p.r + Math.sin(p.ph) * 0.6);
        g.scale(Math.max(0.12, Math.abs(flip)), 1);
        g.drawImage(p.sp, -size / 2, -size * (p.sp.height / p.sp.width) / 2, size, size * (p.sp.height / p.sp.width));
        if (flip < 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-size, -size, size * 2, size * 2); }
        g.restore();
      }
    }
  });
});
