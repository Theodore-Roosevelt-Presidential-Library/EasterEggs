// An olive branch grows across the lower part of the page, leaf by leaf, for peace.
// options: { lines: [type band text] }
import { play, rand } from './lib.js';
import { typeBands, applyGrain } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const { g, w, h } = s.canvas();
  // The stem: a long gentle S-curve from the left edge, sampled into points.
  const x0 = -20, y0 = h * 0.86, x1 = w * 0.92, y1 = h * 0.7;
  const c1 = [w * 0.3, h * 0.98], c2 = [w * 0.6, h * 0.6];
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400, u = 1 - t;
    pts.push([u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x1,
      u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y1]);
  }
  // Leaves in pairs along the stem, plus a few olives.
  const leaves = [];
  for (let f = 30; f < 395; f += rand(16, 26)) {
    const i = Math.floor(f);
    const [px, py] = pts[i], [qx, qy] = pts[Math.min(400, i + 2)];
    const a = Math.atan2(qy - py, qx - px);
    for (const side of [-1, 1]) leaves.push({ at: i / 400, x: px, y: py, a: a + side * rand(0.55, 0.95), len: rand(26, 44) * Math.min(1.2, w / 900 + 0.4), side });
    if (Math.random() < 0.18) leaves.push({ at: i / 400, x: px, y: py, olive: true, a: a + 1.6 });
  }
  if (o.lines) setTimeout(() => { if (!s.closed) typeBands(s, o.lines, { top: '28%', hold: 3000 }); }, 600);

  const grow = 3.6;
  await s.loop(8.5, (t) => {
    const p = Math.min(1, t / grow), fade = t > 7.3 ? Math.max(0, 1 - (t - 7.3) / 1.2) : 1;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = fade;
    // stem, tapering toward the growing tip
    const n = Math.floor(p * 400);
    for (let i = 1; i <= n; i++) {
      g.strokeStyle = '#6E5A3A'; g.lineWidth = 6 * (1 - i / 460) + 1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
    for (const l of leaves) {
      const k = Math.max(0, Math.min(1, (p - l.at) * 6)); // each leaf unfurls just after the tip passes
      if (k <= 0) continue;
      g.save(); g.translate(l.x, l.y); g.rotate(l.a);
      if (l.olive) {
        g.fillStyle = '#4A5A3A'; g.beginPath(); g.ellipse(10 * k, 0, 6 * k, 4.5 * k, 0, 0, 7); g.fill();
      } else {
        const L = l.len * k, W = L * 0.17;
        const lg = g.createLinearGradient(0, -W, 0, W);
        lg.addColorStop(0, '#9DB59A'); lg.addColorStop(0.5, '#6E8F5E'); lg.addColorStop(1, '#C9D8C0'); // silvery underside
        g.fillStyle = lg; g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(L * 0.5, -W * 1.4, L, 0); g.quadraticCurveTo(L * 0.5, W * 1.4, 0, 0); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(2, 0); g.lineTo(L * 0.9, 0); g.stroke();
      }
      g.restore();
    }
    g.globalAlpha = 1;
    applyGrain(g, w, h, 0.6);
  });
});
