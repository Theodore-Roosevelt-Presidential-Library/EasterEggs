// A strip of parchment rises and "We the People" writes itself across it, in the engrossed hand
// of the signed Constitution itself (traced from the National Archives scan of page one).
// options: { script: "img/we-the-people.webp", credit }
import { play } from './lib.js';
import { grainDataURL } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const { g, w, h } = s.canvas();
  const ink = new Image(); ink.src = new URL(o.script || 'img/we-the-people.webp', ctx.base).href;
  try { await ink.decode(); } catch (e) { return; }
  if (s.closed) return;

  const PW = Math.min(860, w * 0.92), PH = PW * 0.3, px = (w - PW) / 2, py = Math.min(h * 0.62, h - PH - 36) - PH / 2;
  const IW = PW * 0.84, IH = IW * ink.height / ink.width, ix = (w - IW) / 2, iy = py + (PH - IH) / 2;
  const grain = new Image(); grain.src = grainDataURL();

  // Where the ink sits in each column, so the quill follows the letters rather than a straight line.
  const probe = document.createElement('canvas'); probe.width = ink.width; probe.height = ink.height;
  const pg = probe.getContext('2d'); pg.drawImage(ink, 0, 0);
  const data = pg.getImageData(0, 0, ink.width, ink.height).data;
  const col = new Float32Array(ink.width).fill(-1);
  for (let x = 0; x < ink.width; x++) {
    let sy = 0, n = 0;
    for (let y = 0; y < ink.height; y++) { const a = data[(y * ink.width + x) * 4 + 3]; if (a > 90) { sy += y * a; n += a; } }
    if (n) col[x] = sy / n;
  }
  let last = ink.height * 0.5;
  for (let x = 0; x < ink.width; x++) { if (col[x] < 0) col[x] = last; else last = col[x]; }

  // The writing layer: the script revealed up to a soft edge.
  const layer = document.createElement('canvas'); layer.width = Math.ceil(IW); layer.height = Math.ceil(IH);
  const lg = layer.getContext('2d');

  const edge = Array.from({ length: 60 }, () => Math.random());
  const parchment = () => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) g.lineTo(px + PW * i / 60, py + edge[i % 60] * 6);
    for (let i = 60; i >= 0; i--) g.lineTo(px + PW * i / 60, py + PH - edge[(i + 17) % 60] * 6);
    g.closePath();
  };
  let nibY = iy + IH / 2;

  await s.loop(9, (t, dt) => {
    const rise = Math.min(1, t / 1.2), e = 1 - Math.pow(1 - rise, 3);
    const fade = t > 8 ? Math.max(0, 1 - (t - 8)) : 1;
    g.clearRect(0, 0, w, h);
    g.save(); g.globalAlpha = fade * e; g.translate(0, (1 - e) * 40);
    g.shadowColor = 'rgba(37,40,42,.25)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
    const pgd = g.createLinearGradient(px, py, px + PW, py + PH);
    pgd.addColorStop(0, '#F4E9D2'); pgd.addColorStop(0.5, '#EEDFC0'); pgd.addColorStop(1, '#E2CFA6');
    g.fillStyle = pgd; parchment(); g.fill();
    g.shadowColor = 'transparent';
    if (grain.complete) { g.save(); parchment(); g.clip(); g.globalAlpha = 0.35 * fade; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(px, py, PW, PH); g.restore(); }

    // The hand moves at an even pace with a slight rhythm, like a pen lifting between strokes.
    const p = Math.max(0, Math.min(1, (t - 1.3) / 4.6)), q = p < 1 ? Math.max(0, p - Math.sin(p * Math.PI * 6) * 0.012) : 1;
    const rx = IW * q;
    lg.clearRect(0, 0, layer.width, layer.height);
    lg.globalCompositeOperation = 'source-over'; lg.drawImage(ink, 0, 0, IW, IH);
    lg.globalCompositeOperation = 'destination-in';
    const m = lg.createLinearGradient(rx - 18, 0, rx + 2, 0);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = m; lg.fillRect(0, 0, layer.width, layer.height);
    lg.globalCompositeOperation = 'source-over';
    g.globalAlpha = fade * e * 0.94; g.drawImage(layer, ix, iy);
    g.globalAlpha = fade * e;

    // The quill: its nib rides the ink line, its feather leans back over the hand.
    if (p > 0 && p < 1) {
      const target = iy + col[Math.min(ink.width - 1, Math.floor(ink.width * q))] * IH / ink.height;
      nibY += (target - nibY) * Math.min(1, dt * 10);
      const nx = ix + rx, ny = nibY;
      g.strokeStyle = '#2A2118'; g.lineWidth = 2; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 46, ny - 70); g.stroke();
      g.fillStyle = '#FBF7EE'; g.strokeStyle = 'rgba(37,40,42,.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(nx + 46, ny - 70); g.quadraticCurveTo(nx + 30, ny - 120, nx + 80, ny - 150); g.quadraticCurveTo(nx + 72, ny - 100, nx + 46, ny - 70); g.fill(); g.stroke();
    }
    g.restore();
  });
});
