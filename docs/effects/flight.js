// Birds crossing the top of the page, drawn as ink strokes that actually fly.
// options: { kind: "pelican" | "duck" | "flock", count }
//   pelican: a slow single-file line that glides and flaps in a wave, as brown pelicans do
//   duck:    a fast V
//   flock:   a murmuration that swirls across (boids)
import { play, rand } from './lib.js';
import { applyGrain } from './paint.js';

function bird(g, x, y, s, wing, angle, col, bill) {
  g.save(); g.translate(x, y); g.rotate(angle); g.fillStyle = col;
  const up = Math.sin(wing) * s * 0.75, tip = Math.sin(wing - 0.6) * s * 0.9;
  g.beginPath();
  g.moveTo(-s * 0.15, 0);
  g.quadraticCurveTo(-s * 0.5, -up * 0.9 - s * 0.1, -s * 1.1, -tip);        // left wing, leading edge
  g.quadraticCurveTo(-s * 0.55, -up * 0.55 + s * 0.08, -s * 0.05, s * 0.1); // trailing edge
  g.quadraticCurveTo(s * 0.55, -up * 0.55 + s * 0.08, s * 1.1, -tip);
  g.quadraticCurveTo(s * 0.5, -up * 0.9 - s * 0.1, s * 0.15, 0);
  g.closePath(); g.fill();
  g.beginPath(); g.ellipse(0, s * 0.05, s * 0.16, s * 0.42, Math.PI / 2, 0, 7); g.fill(); // body
  if (bill) { g.lineWidth = s * 0.09; g.strokeStyle = col; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 0.3, s * 0.02); g.lineTo(s * 0.95, s * 0.12); g.stroke(); }
  g.restore();
}

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const { g, w, h } = s.canvas();
  const kind = o.kind || 'flock';
  const birds = [];
  const top = h * 0.16;

  if (kind === 'pelican') {
    const n = o.count || 7;
    for (let i = 0; i < n; i++) birds.push({ x: -60 - i * 70, y: top + i * 6 + rand(-4, 4), s: 22, ph: -i * 0.55 });
  } else if (kind === 'duck') {
    const n = o.count || 9;
    for (let i = 0; i < n; i++) { const r = Math.ceil(i / 2), side = i % 2 ? -1 : 1; birds.push({ x: -40 - r * 42, y: top + 40 + r * 26 * side, s: 11, ph: rand(0, 6) }); }
  } else {
    const n = o.count || Math.round(Math.min(160, w / 8));
    for (let i = 0; i < n; i++) birds.push({ x: rand(-w * 0.45, -20), y: top + rand(-30, 90), vx: rand(120, 170), vy: rand(-20, 20), s: rand(4, 6.5), ph: rand(0, 6) });
  }

  await s.loop(10, (t, dt) => {
    g.clearRect(0, 0, w, h);
    if (kind === 'flock') {
      // Boids: cohesion toward neighbors, alignment, separation, and a gentle pull across the page.
      const cx = birds.reduce((a, b) => a + b.x, 0) / birds.length, cy = birds.reduce((a, b) => a + b.y, 0) / birds.length;
      const avx = birds.reduce((a, b) => a + b.vx, 0) / birds.length, avy = birds.reduce((a, b) => a + b.vy, 0) / birds.length;
      const swirl = Math.sin(t * 0.9) * 90;
      for (const b of birds) {
        let sx = 0, sy = 0;
        for (const o2 of birds) { const dx = b.x - o2.x, dy = b.y - o2.y, d2 = dx * dx + dy * dy; if (d2 > 0 && d2 < 140) { sx += dx / d2; sy += dy / d2; } }
        b.vx += ((cx - b.x) * 0.25 + (avx - b.vx) * 0.6 + sx * 900 + 22) * dt;
        b.vy += ((cy + swirl - b.y) * 0.5 + (avy - b.vy) * 0.6 + sy * 900 + (top + 40 - cy) * 0.4) * dt;
        const sp = Math.hypot(b.vx, b.vy), max = 230; if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * 16;
        bird(g, b.x, b.y, b.s, b.ph, Math.atan2(b.vy, b.vx) * 0.3, '#25282A');
      }
    } else {
      const speed = kind === 'pelican' ? (w + 700) / 8.5 : (w + 500) / 6.5;
      for (const b of birds) {
        b.x += speed * dt;
        // Pelicans flap in a wave that passes down the line, then glide.
        const flapping = kind === 'pelican' ? Math.sin(t * 1.1 + b.ph) > 0.2 : true;
        b.ph += dt * (kind === 'pelican' ? (flapping ? 5 : 0.4) : 15);
        const wing = flapping ? b.ph : 0.35 + Math.sin(b.ph) * 0.08;
        const y = b.y + Math.sin(t * 1.3 + b.ph * 0.2) * 5;
        bird(g, b.x, y, b.s, wing, 0.02, kind === 'pelican' ? '#4A3A2E' : '#2E3A34', kind === 'pelican');
      }
    }
    applyGrain(g, w, h, 0.8);
  });
});
