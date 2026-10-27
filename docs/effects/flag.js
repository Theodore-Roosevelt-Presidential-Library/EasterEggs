// The American flag rises on its pole and waves in the wind.
// options: { lines: [type band text] }
import { play } from './lib.js';
import { typeBands, applyGrain } from './paint.js';

const RED = '#B22234', BLUE = '#3C3B6E';

// The flag drawn flat once (13 stripes, 50 stars in 9 alternating rows), then waved by slices.
function flatFlag(W) {
  const H = Math.round(W / 1.9), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), sh = H / 13;
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : RED; g.fillRect(0, i * sh, W, Math.ceil(sh)); }
  const cw = W * 0.4, ch = sh * 7;
  g.fillStyle = BLUE; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#FFFFFF';
  const r = H * 0.0308; // star diameter is 0.0616 of the hoist
  for (let row = 0; row < 9; row++) {
    const n = row % 2 ? 5 : 6;
    for (let col = 0; col < n; col++) {
      const x = cw * ((row % 2 ? 2 : 1) + col * 2) / 12, y = ch * (row + 1) / 10;
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.fill();
    }
  }
  return c;
}

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const { g, w, h } = s.canvas();
  const FW = Math.round(w < 600 ? w * 0.62 : Math.min(400, w * 0.4)), flag = flatFlag(FW), FH = flag.height;
  // Flag in the lower part of the screen, clear of the type bands above it.
  const poleX = Math.round(w * 0.5 - FW * 0.42), topY = h - FH - Math.max(40, h * 0.07);
  if (o.lines) setTimeout(() => { if (!s.closed) typeBands(s, o.lines, { top: '26%', hold: 3000 }); }, 700);

  await s.loop(8.5, (t) => {
    const rise = Math.min(1, t / 1.6), e = 1 - Math.pow(1 - rise, 3);
    const fade = t > 7.4 ? Math.max(0, 1 - (t - 7.4) / 1.1) : 1;
    const y = topY + (1 - e) * (h - topY + FH);
    g.clearRect(0, 0, w, h);
    g.globalAlpha = fade;
    // pole
    const pg = g.createLinearGradient(poleX - 4, 0, poleX + 4, 0);
    pg.addColorStop(0, '#9A9A92'); pg.addColorStop(0.5, '#E8E6DD'); pg.addColorStop(1, '#7A7A72');
    g.fillStyle = pg; g.fillRect(poleX - 4, y - 14, 8, h - y + 14);
    g.fillStyle = '#D9A441'; g.beginPath(); g.arc(poleX, y - 16, 7, 0, 7); g.fill();
    // cloth: vertical slices displaced by a traveling wave that grows away from the pole
    const slice = 3;
    for (let x = 0; x < FW; x += slice) {
      const k = x / FW, phase = x * 0.022 - t * 5.2;
      const dy = Math.sin(phase) * 12 * k + Math.sin(phase * 0.5 + 1) * 5 * k;
      const slope = Math.cos(phase) * 0.6 * k;
      g.drawImage(flag, x, 0, slice + 0.6, FH, poleX + 4 + x, y + dy, slice + 0.6, FH * (1 - 0.04 * k));
      g.fillStyle = slope > 0 ? `rgba(255,255,255,${slope * 0.22})` : `rgba(0,0,0,${-slope * 0.3})`;
      g.fillRect(poleX + 4 + x, y + dy, slice + 0.6, FH * (1 - 0.04 * k));
    }
    g.globalAlpha = 1;
    applyGrain(g, w, h, 0.5);
  });
});
