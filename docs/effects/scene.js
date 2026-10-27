// A painted Badlands scene rises from the bottom of the screen with something alive in it.
// options: { kind: badlands|canyon|tower|forest|prairie|river|sea, time: day|dawn|dusk|night,
//            life: bison|pronghorn|hiker|train|canoe|ship, count, lines: [type band text] }
import { play, rand } from './lib.js';
import { landscape, bison, pronghorn, hiker, train, ship, canoe, puffs, typeBands } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const { g, w, h } = s.canvas();
  const bandH = Math.round(Math.min(340, Math.max(190, h * 0.38)));
  const L = landscape(w, bandH, o.kind || 'badlands', o.time || 'day');
  const steam = puffs();
  const life = o.life, count = o.count || (life === 'bison' ? 6 : life === 'pronghorn' ? 4 : 1);
  const scale = Math.max(0.7, Math.min(1.15, w / 1100));
  const actors = Array.from({ length: life ? count : 0 }, (_, i) => {
    const herd = life === 'bison' || life === 'pronghorn';
    return {
      x: herd ? w * rand(0.08, 0.6) + i * 18 : life === 'train' ? w * 0.18 : life === 'ship' ? w * 0.34 : life === 'canoe' ? w * 0.3 : w * 0.1,
      s: ({ bison: 38, pronghorn: 34, hiker: 26, train: 26, ship: 22, canoe: 14 }[life] || 24) * scale * (herd ? rand(0.8, 1.1) : 1),
      v: ({ bison: 9, pronghorn: 26, hiker: 22, train: w / 6.5, ship: 18, canoe: 28 }[life] || 20) * (herd ? rand(0.8, 1.2) : 1),
      ph: rand(0, 6), grazing: herd && Math.random() < 0.35, depth: herd ? rand(-6, 8) : 0
    };
  }).sort((a, b) => a.depth - b.depth);
  if (o.lines) setTimeout(() => { if (!s.closed) typeBands(s, o.lines, { top: '32%', hold: 2400 }); }, 900);

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let puffClock = 0;
  await s.loop(9.2, (t, dt) => {
    const up = t < 1.5 ? ease(t / 1.5) : t > 8.2 ? 1 - ease(Math.min(1, (t - 8.2) / 1)) : 1;
    const y0 = h - bandH * up;
    g.clearRect(0, 0, w, h);
    g.drawImage(L.cv, 0, y0, w, bandH);

    // grass moving in the wind along the near hills (prairie only)
    if (o.kind === 'prairie') {
      for (let x = 0; x < w; x += 5) {
        const gy = y0 + L.ground[Math.min(L.ground.length - 1, x | 0)];
        const sway = Math.sin(t * 1.8 + x * 0.018) * 6 + Math.sin(t * 3.1 + x * 0.05) * 2;
        const hh = 14 + ((x * 7919) % 23);
        g.strokeStyle = x % 3 ? '#6E9A55' : '#87BB41'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x, gy + 6); g.quadraticCurveTo(x + sway * 0.3, gy - hh * 0.5, x + sway, gy - hh); g.stroke();
        if (x % 85 === 0) { g.fillStyle = ['#F9D635', '#F36079', '#FC924E', '#fff'][(x / 85) % 4]; g.beginPath(); g.arc(x + sway, gy - hh, 3, 0, 7); g.fill(); }
      }
    }

    for (const a of actors) {
      if (!a.grazing || Math.sin(t * 0.7 + a.ph) > 0.4) { a.x += a.v * dt; a.ph += dt * (a.v / (a.s * 0.9)) * 2.2; }
      if (a.x > w + 400) continue;
      const gx = Math.max(0, Math.min(L.ground.length - 1, a.x | 0));
      const gy = y0 + L.ground[gx] + a.depth;
      if (life === 'bison') bison(g, a.x, gy, a.s, a.ph);
      else if (life === 'pronghorn') pronghorn(g, a.x, gy, a.s, a.ph);
      else if (life === 'hiker') hiker(g, a.x, gy, a.s, a.ph * 1.6);
      else if (life === 'canoe') canoe(g, a.x, gy + Math.sin(t * 2) * 1.2, a.s, t * 3);
      else if (life === 'train' || life === 'ship') {
        const st = life === 'train' ? train(g, a.x, gy, a.s) : ship(g, a.x, gy + Math.sin(t * 1.4) * 1.2, a.s);
        puffClock += dt;
        if (puffClock > 0.07) { puffClock = 0; steam.add(st.x, st.y, life === 'ship'); }
      }
    }
    steam.draw(g, dt);
  });
});
