// A painted landscape rises from the bottom of the screen with something alive in it.
// Real photographs (options.photo) land on top as white-bordered prints, unless ctx.style is "painted".
// options: { photo: {src, focus, credit} | [photos for a montage],
//            kind: badlands|canyon|tower|forest|bottomland|hills|prairie|river|sea, montage: [kinds],
//            time: day|dawn|dusk|night, sun: true, leaves: true,
//            life: bison|pronghorn|horses|hiker|train|canoe|ship, count, lines: [type band text] }
import { play, rand } from './lib.js';
import { landscape, bison, pronghorn, horse, hiker, train, ship, canoe, puffs, typeBands, grainDataURL } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const photos = o.photo && ctx.style !== 'painted' ? [].concat(o.photo) : [];
  // The painted scene always plays. Real photographs, when a delight has them, land on top
  // as white-bordered prints, the way the brand layers photography over graphics.
  const total = photos.length > 1 ? Math.max(9.2, photos.length * 2.4 + 4.2) : 9.2;
  if (photos.length) prints(s, photos, ctx, total, !!o.lines);
  return painted(s, egg, o, total);
});

// ---------- photo prints ----------
async function prints(s, photos, ctx, total, hasLines) {
  const imgs = photos.map((p) => { const i = new Image(); i.decoding = 'async'; i.src = new URL(p.src, ctx.base).href; return i; });
  try { await Promise.race([Promise.all(imgs.map((i) => i.decode())), new Promise((_, r) => setTimeout(r, 5000))]); }
  catch (e) { return; } // slow or missing photo: the painted scene plays on its own
  if (s.closed) return;
  const W = s.vw(), H = s.vh(), narrow = W < 600;
  const pw = Math.round(narrow ? W * 0.62 : Math.min(330, W * 0.26));
  const style = document.createElement('style');
  style.textContent = `
  .print{position:absolute;width:${pw}px;padding:${Math.round(pw * 0.035)}px ${Math.round(pw * 0.035)}px ${Math.round(pw * 0.1)}px;background:#FBFAF6;
    box-shadow:0 14px 34px rgba(9,42,77,.28),0 2px 6px rgba(0,0,0,.12);transform-origin:50% 100%;opacity:0}
  .print img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
  .print::after{content:"";position:absolute;inset:0;background-image:url(${grainDataURL()});mix-blend-mode:multiply;opacity:.18;pointer-events:none}`;
  s.root.appendChild(style);
  // Prints sit over the landscape, to the right of center, and stack when there are several.
  const baseLeft = narrow ? (W - pw) / 2 : W * (hasLines ? 0.78 : 0.66) - pw / 2, baseBottom = Math.max(24, H * 0.06);
  const per = (total - 3.6) / photos.length;
  const els = imgs.map((img, i) => {
    const el = s.add('', `left:${baseLeft + (i % 2 ? 26 : -18) * (narrow ? 0.4 : 1)}px;bottom:${baseBottom + i * 6}px;z-index:${2 + i}`);
    el.className = 'print';
    img.style.objectPosition = `50% ${photos[i].focus ?? 55}%`;
    el.appendChild(img);
    const rot = [-4, 3, -1.5, 5][i % 4];
    el.animate([
      { opacity: 0, transform: `translateY(60px) rotate(${rot - 9}deg) scale(.92)` },
      { opacity: 1, transform: `translateY(-8px) rotate(${rot + 1}deg) scale(1.01)`, offset: 0.7 },
      { opacity: 1, transform: `translateY(0) rotate(${rot}deg) scale(1)` }
    ], { duration: 900, delay: 1300 + i * per * 1000, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'forwards' });
    return { el, rot };
  });
  setTimeout(() => {
    if (s.closed) return;
    els.forEach(({ el, rot }, i) => el.animate([{ opacity: 1, transform: `rotate(${rot}deg)` }, { opacity: 0, transform: `translateY(80px) rotate(${rot + 6}deg)` }],
      { duration: 700, delay: i * 60, easing: 'ease-in', fill: 'forwards' }));
  }, (total - 1.4) * 1000);
}

// ---------- painted ----------
async function painted(s, egg, o, total) {
  const { g, w, h } = s.canvas();
  const bandH = Math.round(Math.min(340, Math.max(190, h * 0.38)));
  const kinds = o.montage || [o.kind || 'badlands'];
  const lands = kinds.map((k) => landscape(w, bandH, k, o.time || 'day'));
  const L = lands[0];
  const steam = puffs();
  const life = o.life, count = o.count || ({ bison: 6, pronghorn: 4, horses: 5 }[life] || 1);
  const scale = Math.max(0.7, Math.min(1.15, w / 1100));
  const herdKind = life === 'bison' || life === 'pronghorn' || life === 'horses';
  const actors = Array.from({ length: life ? count : 0 }, (_, i) => ({
    x: herdKind ? w * rand(0.08, 0.6) + i * 18 : life === 'train' ? w * 0.18 : life === 'ship' ? w * 0.34 : life === 'canoe' ? w * 0.3 : w * 0.1,
    s: ({ bison: 38, pronghorn: 34, horses: 36, hiker: 26, train: 26, ship: 22, canoe: 14 }[life] || 24) * scale * (herdKind ? rand(0.8, 1.1) : 1),
    v: ({ bison: 9, pronghorn: 26, horses: 22, hiker: 22, train: w / 6.5, ship: 18, canoe: 28 }[life] || 20) * (herdKind ? rand(0.8, 1.2) : 1),
    ph: rand(0, 6), grazing: herdKind && Math.random() < 0.35, depth: herdKind ? rand(-6, 8) : 0
  })).sort((a, b) => a.depth - b.depth);
  const leaves = o.leaves ? Array.from({ length: 40 }, () => ({ x: rand(0, w), y: rand(-h, 0), r: rand(0, 6), v: rand(40, 90), c: ['#B5552F', '#C9862F', '#9C4A2D', '#E7805D'][Math.floor(rand(0, 4))] })) : [];
  total = Math.max(total || 9.2, kinds.length > 1 ? kinds.length * 3.2 : 9.2);
  if (o.lines) setTimeout(() => { if (!s.closed) typeBands(s, o.lines, { top: '32%', hold: Math.min(3600, total * 1000 - 4200) }); }, 900);

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let puffClock = 0;
  await s.loop(total, (t, dt) => {
    const up = t < 1.5 ? ease(t / 1.5) : t > total - 1 ? 1 - ease(Math.min(1, (t - (total - 1)) / 1)) : 1;
    const y0 = h - bandH * up;
    g.clearRect(0, 0, w, h);

    // A sun that climbs behind the hills.
    if (o.sun) {
      const sy = y0 + bandH * (0.7 - Math.min(1, t / 6) * 0.45), sx = w * 0.7;
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, bandH * 0.9);
      glow.addColorStop(0, 'rgba(252,146,78,.55)'); glow.addColorStop(1, 'rgba(252,146,78,0)');
      g.fillStyle = glow; g.fillRect(0, y0 - bandH * 0.5, w, bandH * 1.5);
      g.fillStyle = '#F9D635'; g.beginPath(); g.arc(sx, sy, Math.min(46, bandH * 0.16), 0, 7); g.fill();
    }

    // In a montage, each painted landscape cross-fades into the next.
    if (lands.length > 1) {
      const per = total / lands.length, i = Math.min(lands.length - 1, Math.floor(t / per)), f = (t - i * per) / per;
      g.globalAlpha = 1; g.drawImage(lands[i].cv, 0, y0, w, bandH);
      if (i < lands.length - 1 && f > 0.75) { g.globalAlpha = (f - 0.75) / 0.25; g.drawImage(lands[i + 1].cv, 0, y0, w, bandH); }
      g.globalAlpha = 1;
    } else g.drawImage(L.cv, 0, y0, w, bandH);

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
      else if (life === 'horses') horse(g, a.x, gy, a.s, a.ph);
      else if (life === 'hiker') hiker(g, a.x, gy, a.s, a.ph * 1.6);
      else if (life === 'canoe') canoe(g, a.x, gy + Math.sin(t * 2) * 1.2, a.s, t * 3);
      else if (life === 'train' || life === 'ship') {
        const st = life === 'train' ? train(g, a.x, gy, a.s) : ship(g, a.x, gy + Math.sin(t * 1.4) * 1.2, a.s);
        puffClock += dt;
        if (puffClock > 0.07) { puffClock = 0; steam.add(st.x, st.y, life === 'ship'); }
      }
    }
    steam.draw(g, dt);

    for (const l of leaves) { // November leaves drifting down over the woods
      l.y += l.v * dt; l.r += dt * 2;
      const x = l.x + Math.sin(t * 1.5 + l.r) * 30;
      if (l.y > h + 10) continue;
      g.save(); g.translate(x, l.y); g.rotate(l.r); g.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(l.r * 1.3)));
      g.fillStyle = l.c; g.beginPath(); g.ellipse(0, 0, 7, 4, 0, 0, 7); g.fill(); g.restore();
    }
  });
}
