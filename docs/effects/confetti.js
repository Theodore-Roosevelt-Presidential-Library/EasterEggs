// A celebration: paper confetti and curling streamers in the brand brights, with big type.
// options: { lines: ["HAPPY", "BIRTHDAY,", "T.R."], shapes: ["paper","streamer","glasses"] }
import { play, BRIGHTS, C, rand, pick, drawGlasses } from './lib.js';
import { typeBands } from './paint.js';

const COLORS = BRIGHTS.concat(C.orange, C.sand);

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const { g, w, h } = s.canvas();
  const o = egg.options || {};
  const shapes = o.shapes || ['paper', 'paper', 'paper', 'streamer'];
  const colors = o.colors || COLORS;
  const ps = [];
  const make = (x, y, vx, vy) => {
    const shape = pick(shapes);
    ps.push({ x, y, vx, vy, shape, c: pick(colors), s: rand(7, 13), r: rand(0, 6.28), vr: rand(-6, 6),
      tilt: rand(0, 6.28), vt: rand(5, 12), wob: rand(0, 6.28), len: rand(40, 90), trail: [] });
  };
  const cannon = (x, dir, n) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + dir * rand(0.18, 0.7), v = rand(h * 1.0, h * 1.75);
      make(x, h + 10, Math.cos(a) * v, Math.sin(a) * v);
    }
  };
  cannon(0, 1, 80); cannon(w, -1, 80);
  setTimeout(() => { if (!s.closed) { cannon(w * 0.2, 0.35, 40); cannon(w * 0.8, -0.35, 40); } }, 450);
  if (o.lines) setTimeout(() => { if (!s.closed) typeBands(s, o.lines, { top: '40%', hold: 2600 }); }, 350);

  await s.loop(7, (t, dt) => {
    g.clearRect(0, 0, w, h);
    const fade = t > 5.6 ? Math.max(0, 1 - (t - 5.6) / 1.4) : 1;
    for (const p of ps) {
      p.vy += h * 0.85 * dt;
      const drag = p.shape === 'streamer' ? 2.2 : 1.7;
      p.vx *= 1 - drag * dt; p.vy *= 1 - drag * 0.7 * dt;
      p.vy = Math.min(p.vy, p.shape === 'streamer' ? 140 : 170);
      p.wob += dt * 3; p.tilt += p.vt * dt; p.r += p.vr * dt;
      p.x += (p.vx + Math.sin(p.wob) * 28) * dt; p.y += p.vy * dt;
      if (p.y > h + 80) continue;
      g.globalAlpha = fade;
      if (p.shape === 'streamer') {
        p.trail.unshift([p.x, p.y]); if (p.trail.length > 18) p.trail.pop();
        if (p.trail.length > 2) { // a ribbon that curls behind its head and narrows to the tail
          for (let i = 1; i < p.trail.length; i++) {
            const [x0, y0] = p.trail[i - 1], [x1, y1] = p.trail[i];
            g.strokeStyle = p.c; g.lineCap = 'round'; g.lineWidth = Math.max(1, 5 * (1 - i / p.trail.length)) * (0.6 + 0.4 * Math.abs(Math.cos(p.tilt + i * 0.4)));
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 + Math.sin(p.tilt + i) * 2, y1); g.stroke();
          }
        }
      } else if (p.shape === 'glasses') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); drawGlasses(g, p.s * 1.4, C.gray); g.restore();
      } else {
        // Paper: a square that tumbles in 3D, catching light as it turns.
        const turn = Math.cos(p.tilt), light = 0.55 + 0.45 * Math.abs(Math.sin(p.tilt * 0.7 + p.r));
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, turn);
        g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 2.6, p.s, p.s / 1.3);
        g.fillStyle = `rgba(${turn > 0 ? '255,255,255' : '0,0,0'},${(1 - light) * 0.35})`; g.fillRect(-p.s / 2, -p.s / 2.6, p.s, p.s / 1.3);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  });
});
