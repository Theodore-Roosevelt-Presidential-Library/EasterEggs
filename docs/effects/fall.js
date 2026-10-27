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
    : kind === 'pages' ? [pageSprite(), pageSprite(), pageSprite()] : null;
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
        const r = 1.2 + p.z * 5.5, blur = p.z > 0.7 ? (p.z - 0.7) * 3 : 0;
        const gr = g.createRadialGradient(x, p.y, 0, x, p.y, r * (1 + blur));
        gr.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`); gr.addColorStop(0.55, `rgba(240,246,252,${0.75 * fade})`); gr.addColorStop(1, 'rgba(225,235,245,0)');
        // a faint blue rim so flakes read on white pages too
        g.fillStyle = `rgba(153,173,197,${0.5 * fade * (0.5 + p.z * 0.5)})`; g.beginPath(); g.arc(x, p.y, r * (1 + blur) + 0.6, 0, 7); g.fill();
        g.fillStyle = gr; g.beginPath(); g.arc(x, p.y, r * (1 + blur), 0, 7); g.fill();
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
