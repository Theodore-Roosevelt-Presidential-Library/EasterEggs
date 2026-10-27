// Fireworks over the Badlands at dusk: soft glowing shells with trails, willows that droop and sparkle.
import { play, C, rand, pick } from './lib.js';
import { landscape } from './paint.js';

const SHELLS = [C.yellow, C.pink, C.sunset, C.bright, '#FFFFFF', '#9FD3FF'];

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const { g, w, h } = s.canvas();
  const bandH = Math.round(Math.min(260, h * 0.3));
  const land = landscape(w, bandH, 'badlands', 'night');
  const rockets = [], sparks = [];
  let next = 0.4;

  await s.loop(9, (t, dt) => {
    const k = t < 1.2 ? t / 1.2 : t > 8 ? Math.max(0, 9 - t) : 1;
    g.clearRect(0, 0, w, h);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, `rgba(9,26,48,${0.86 * k})`); sky.addColorStop(0.7, `rgba(20,52,82,${0.78 * k})`); sky.addColorStop(1, `rgba(120,70,70,${0.6 * k})`);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);

    if (t > next && t < 7) {
      next = t + rand(0.28, 0.7);
      rockets.push({ x: rand(w * 0.1, w * 0.9), y: h - bandH * 0.6, vx: rand(-20, 20), vy: -rand(h * 0.7, h * 0.95), top: rand(h * 0.12, h * 0.42),
        c: pick(SHELLS), kind: Math.random() < 0.3 ? 'willow' : 'peony' });
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 60 * dt;
      g.globalAlpha = k; g.fillStyle = '#FFE9B8'; g.beginPath(); g.arc(r.x, r.y, 1.8, 0, 7); g.fill();
      if (Math.random() < 0.6) sparks.push({ x: r.x, y: r.y + 4, vx: rand(-10, 10), vy: rand(10, 40), life: 0.5, c: '#FFC97A', tr: [], drag: 2, g: 20, size: 1 });
      if (r.y <= r.top) {
        rockets.splice(i, 1);
        const n = r.kind === 'willow' ? 90 : 110;
        for (let j = 0; j < n; j++) {
          const a = rand(0, 6.283), v = (r.kind === 'willow' ? rand(60, 150) : rand(90, 230)) * (0.85 + 0.15 * Math.random());
          sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: r.kind === 'willow' ? rand(1.6, 2.2) : rand(1, 1.5),
            c: r.kind === 'willow' ? '#FFC97A' : (Math.random() < 0.18 ? '#FFFFFF' : r.c), tr: [], drag: r.kind === 'willow' ? 1.6 : 1.3, g: r.kind === 'willow' ? 70 : 45, size: r.kind === 'willow' ? 1.4 : 2 });
        }
        // a soft flash
        const fl = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, 160); fl.addColorStop(0, 'rgba(255,240,210,.35)'); fl.addColorStop(1, 'rgba(255,240,210,0)');
        g.fillStyle = fl; g.fillRect(r.x - 160, r.y - 160, 320, 320);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.tr.unshift([p.x, p.y]); if (p.tr.length > 7) p.tr.pop();
      p.vx *= 1 - p.drag * dt; p.vy = p.vy * (1 - p.drag * dt) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const a = Math.min(1, p.life) * k * (p.life < 0.6 && Math.random() < 0.3 ? 0.3 : 1); // crackle as they die
      g.strokeStyle = p.c; g.lineCap = 'round';
      for (let j = 1; j < p.tr.length; j++) {
        g.globalAlpha = a * (1 - j / p.tr.length) * 0.8; g.lineWidth = p.size * (1 - j / p.tr.length) + 0.4;
        g.beginPath(); g.moveTo(p.tr[j - 1][0], p.tr[j - 1][1]); g.lineTo(p.tr[j][0], p.tr[j][1]); g.stroke();
      }
      g.globalAlpha = a; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = k; g.drawImage(land.cv, 0, h - bandH, w, bandH); g.globalAlpha = 1;
  });
});
