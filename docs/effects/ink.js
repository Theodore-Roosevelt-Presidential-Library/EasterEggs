// A strip of parchment rises and "We the People" writes itself across it in ink.
// options: { words: "We the People" }
import { play } from './lib.js';
import { grainDataURL } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const o = egg.options || {};
  const words = o.words || 'We the People';
  const { g, w, h } = s.canvas();
  const PW = Math.min(820, w * 0.9), PH = Math.min(230, h * 0.3), px = (w - PW) / 2, py = h * 0.62 - PH / 2;
  const size = Math.min(PH * 0.5, PW / words.length * 1.7);
  g.font = `italic 700 ${size}px Clearface, Georgia, serif`;
  const tw = g.measureText(words).width, tx = (w - tw) / 2, ty = py + PH * 0.5 + size * 0.3;
  const grain = new Image(); grain.src = grainDataURL();

  // ragged parchment edge, fixed once
  const edge = Array.from({ length: 60 }, () => Math.random());
  const parchment = () => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) g.lineTo(px + PW * i / 60, py + edge[i % 60] * 6);
    for (let i = 60; i >= 0; i--) g.lineTo(px + PW * i / 60, py + PH - edge[(i + 17) % 60] * 6);
    g.closePath();
  };

  await s.loop(8, (t) => {
    const rise = Math.min(1, t / 1.2), e = 1 - Math.pow(1 - rise, 3);
    const fade = t > 7 ? Math.max(0, 1 - (t - 7)) : 1;
    g.clearRect(0, 0, w, h);
    g.save(); g.globalAlpha = fade * e; g.translate(0, (1 - e) * 40);
    g.shadowColor = 'rgba(37,40,42,.25)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
    const pgd = g.createLinearGradient(px, py, px + PW, py + PH);
    pgd.addColorStop(0, '#F4E9D2'); pgd.addColorStop(0.5, '#EEDFC0'); pgd.addColorStop(1, '#E2CFA6');
    g.fillStyle = pgd; parchment(); g.fill();
    g.shadowColor = 'transparent';
    if (grain.complete) { g.save(); parchment(); g.clip(); g.globalAlpha = 0.35 * fade; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(px, py, PW, PH); g.restore(); }
    // the words, revealed left to right as if written
    const p = Math.max(0, Math.min(1, (t - 1.2) / 3.4));
    g.save(); g.beginPath(); g.rect(tx - 10, py, (tw + 20) * p, PH); g.clip();
    g.fillStyle = '#2A2118'; g.font = `italic 700 ${size}px Clearface, Georgia, serif`; g.fillText(words, tx, ty);
    g.restore();
    // a quill nib following the line
    if (p > 0 && p < 1) {
      const nx = tx + tw * p, ny = ty - size * 0.25;
      g.strokeStyle = '#2A2118'; g.lineWidth = 2; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 46, ny - 70); g.stroke();
      g.fillStyle = '#FBF7EE'; g.strokeStyle = 'rgba(37,40,42,.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(nx + 46, ny - 70); g.quadraticCurveTo(nx + 30, ny - 120, nx + 80, ny - 150); g.quadraticCurveTo(nx + 72, ny - 100, nx + 46, ny - 70); g.fill(); g.stroke();
    }
    g.restore();
  });
});
