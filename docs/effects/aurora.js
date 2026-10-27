// Northern lights curtains across the top of the screen.
import { play, C } from './lib.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const { g, w, h } = s.canvas();
  const band = Math.min(h * 0.55, 420);
  const stars = Array.from({ length: 70 }, () => [Math.random() * w, Math.random() * band * 0.9, Math.random()]);
  const curtains = [
    { c: [143, 200, 149], y: 0.42, amp: 40, f: 0.006, sp: 0.5, hgt: 0.55 },
    { c: [135, 187, 65], y: 0.5, amp: 30, f: 0.009, sp: -0.35, hgt: 0.45 },
    { c: [243, 96, 121], y: 0.3, amp: 26, f: 0.004, sp: 0.25, hgt: 0.3 }
  ];
  // Pre-draw each curtain's fade once; every ray is that strip stretched to its height.
  for (const cu of curtains) {
    const strip = document.createElement('canvas');
    strip.width = 1; strip.height = 128;
    const sg = strip.getContext('2d'), grd = sg.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, `rgba(${cu.c},0)`); grd.addColorStop(1, `rgba(${cu.c},0.22)`);
    sg.fillStyle = grd; sg.fillRect(0, 0, 1, 128);
    cu.strip = strip;
  }

  await s.loop(9, (t) => {
    const k = t < 1.5 ? t / 1.5 : t > 7.5 ? Math.max(0, (9 - t) / 1.5) : 1;
    g.clearRect(0, 0, w, h);
    const sky = g.createLinearGradient(0, 0, 0, band);
    sky.addColorStop(0, `rgba(9,42,77,${0.9 * k})`);
    sky.addColorStop(0.75, `rgba(9,42,77,${0.55 * k})`);
    sky.addColorStop(1, 'rgba(9,42,77,0)');
    g.fillStyle = sky; g.fillRect(0, 0, w, band);
    for (const [x, y, p] of stars) {
      g.globalAlpha = k * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + p * 10)));
      g.fillStyle = C.white; g.fillRect(x, y, 1.6, 1.6);
    }
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = k;
    for (const cu of curtains) {
      for (let x = 0; x < w; x += 4) {
        const base = band * cu.y + Math.sin(x * cu.f + t * cu.sp * 3) * cu.amp + Math.sin(x * cu.f * 2.7 - t) * cu.amp * 0.4;
        const rayH = band * cu.hgt * (0.6 + 0.4 * Math.sin(x * 0.05 + t * 2 + cu.y * 9));
        g.drawImage(cu.strip, x, base - rayH, 4, rayH + 6);
      }
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  });
});
