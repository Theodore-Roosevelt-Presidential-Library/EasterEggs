// Shared stage, banner and helpers for every delight. Loaded only on days a delight plays.

export const C = {
  forest: '#1B4532', night: '#092A4D', gray: '#25282A', white: '#FFFFFF',
  sand: '#D1CCBD', orange: '#E7805D', bright: '#8FC895', sky: '#99ADC5',
  pink: '#F36079', sunset: '#FC924E', yellow: '#F9D635', green: '#87BB41'
};
export const BRIGHTS = [C.pink, C.sunset, C.yellow, C.green, C.bright, C.sky];

const FONT_BASE = 'https://www.trlibrary.com/themes/custom/trpl/css/';
const FONTS = [
  ['Dharma Gothic E', 700, 'dharma_type-dharmagothice-bold.woff2'],
  ['Clearface', 400, 'clearfacestd-regular.woff2'],
  ['Frutiger', 700, 'frutigerltstd-bold.woff2']
];
function loadFonts() {
  if (/^(www\.)?trlibrary\.com$/.test(location.hostname) || document.getElementById('trpl-brand-fonts')) return;
  const s = document.createElement('style');
  s.id = 'trpl-brand-fonts';
  s.textContent = FONTS.map((f) => `@font-face{font-family:"${f[0]}";font-weight:${f[1]};font-style:normal;font-display:swap;src:url("${FONT_BASE}${f[2]}") format("woff2")}`).join('');
  document.head.appendChild(s);
}

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vw = () => document.documentElement.clientWidth || innerWidth;
const vh = () => innerHeight;

function track(event, egg, extra) {
  (window.dataLayer = window.dataLayer || []).push(Object.assign({ event, delight_id: egg.id }, extra || {}));
}

const CSS = `
:host{all:initial}
.stage{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:1}
.card{position:fixed;z-index:3;pointer-events:auto;box-sizing:border-box;width:min(380px,calc(100vw - 32px));
  background:${C.night};color:${C.white};border-radius:14px;padding:18px 44px 18px 20px;
  box-shadow:0 12px 40px rgba(9,42,77,.35);font:16px/1.4 Clearface,Georgia,serif;
  opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s cubic-bezier(.2,.9,.3,1.2)}
.card.in{opacity:1;transform:none}
.card.bottom-left{left:16px;bottom:16px}.card.bottom-right{right:16px;bottom:16px}
.card.top{left:50%;top:16px;transform:translate(-50%,-16px)}.card.top.in{transform:translate(-50%,0)}
@media (max-width:600px){.card.bottom-left,.card.bottom-right{left:16px;right:16px;width:auto}}
.card.quiet{background:${C.white};color:${C.gray};border:1px solid ${C.sand};box-shadow:0 6px 20px rgba(0,0,0,.08)}
h2{margin:0 0 6px;font:700 30px/1 "Dharma Gothic E",Impact,"Arial Narrow",sans-serif;letter-spacing:.01em;text-transform:uppercase;color:${C.yellow}}
.quiet h2{color:${C.forest}}
p{margin:0}
a{display:inline-block;margin-top:10px;color:${C.yellow};font:700 14px/1.2 Frutiger,Arial,Helvetica,sans-serif;text-decoration:underline;text-underline-offset:3px}
.quiet a{color:${C.forest}}
a:focus-visible,button:focus-visible{outline:2px solid ${C.yellow};outline-offset:2px}
button{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:inherit;
  font:24px/1 Arial,sans-serif;cursor:pointer;opacity:.75}
button:hover{opacity:1;background:rgba(255,255,255,.12)}
.quiet button:hover{background:rgba(0,0,0,.06)}
canvas{position:absolute;inset:0;width:100%;height:100%}
.sprite{position:absolute;will-change:transform}
`;

// Sets up the overlay and banner, runs the animation, then cleans up.
// animate(stage) may return a promise; it should finish within about 10 seconds.
export async function play(egg, ctx, animate) {
  loadFonts();
  const host = document.createElement('div');
  host.setAttribute('data-trpl-delight', egg.id);
  // Stay underneath anything the site pins to the screen (ticket button, chat, cookie bar)
  // so those stay visible and clickable while a delight plays.
  const obs = obstacles(ctx.avoid);
  const zs = obs.map((o) => o.z).filter((z) => z > 1);
  const z = zs.length ? Math.max(2, Math.min(...zs) - 1) : 2147483000;
  host.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${z}`;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style><div class="stage"></div>`;
  document.body.appendChild(host);
  const stageEl = root.querySelector('.stage');
  const timers = new Set();
  let closed = false;

  const stage = {
    root, el: stageEl, vw, vh, reduced: reduced(),
    get closed() { return closed; },
    add(html, css) {
      const d = document.createElement('div');
      d.className = 'sprite';
      if (css) d.style.cssText = css;
      d.innerHTML = html;
      stageEl.appendChild(d);
      return d;
    },
    canvas() {
      const cv = document.createElement('canvas');
      stageEl.appendChild(cv);
      const g = cv.getContext('2d');
      const size = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = vw() * dpr; cv.height = vh() * dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      size();
      addEventListener('resize', size);
      timers.add(() => removeEventListener('resize', size));
      return { cv, g, get w() { return vw(); }, get h() { return vh(); } };
    },
    // Calls frame(t seconds, dt seconds) every animation frame for `seconds`, or until frame returns false.
    loop(seconds, frame) {
      return new Promise((resolve) => {
        let t0 = null, last = null;
        const step = (now) => {
          if (closed) return resolve();
          if (t0 === null) { t0 = now; last = now; }
          const t = (now - t0) / 1000, dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (frame(t, dt) === false || t > seconds) return resolve();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
  };

  const card = egg.headline ? banner(root, egg, ctx, () => close(), obs) : null;
  track('delight_view', egg);

  function close() {
    if (closed) return;
    closed = true;
    timers.forEach((f) => f());
    if (card) card.classList.remove('in');
    setTimeout(() => host.remove(), 450);
  }

  try {
    if (animate && !stage.reduced) await animate(stage);
  } catch (e) { if (window.console) console.warn('[TRPL delight]', e); }
  stageEl.innerHTML = '';

  // Keep the banner up a while after the animation, longer if someone is reading it.
  if (card) {
    let hold = false;
    card.addEventListener('mouseenter', () => { hold = true; });
    card.addEventListener('mouseleave', () => { hold = false; });
    card.addEventListener('focusin', () => { hold = true; });
    const until = Date.now() + (ctx.preview ? 6000 : 9000);
    while (!closed && (hold || Date.now() < until)) await sleep(250);
  }
  close();
  await sleep(450);
}

// Everything the site has pinned to the screen: fixed or sticky elements that are visible and
// not page-sized, plus anything matching data-avoid on the script tag.
function obstacles(avoid) {
  const W = vw(), H = vh(), out = [];
  const add = (el, forced) => {
    if (el.closest('[data-trpl-delight]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) return;
    if (!forced && r.width * r.height > W * H * 0.5) return; // a page-sized wrapper, not a widget
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || +s.opacity === 0) return;
    out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, z: parseInt(s.zIndex, 10) || 0 });
  };
  for (const el of document.body.querySelectorAll('*')) {
    const p = getComputedStyle(el).position;
    if (p === 'fixed' || p === 'sticky') add(el, false);
  }
  if (avoid) { try { document.querySelectorAll(avoid).forEach((el) => add(el, true)); } catch (e) {} }
  return out;
}

// Puts the card where it won't cover anything the site has pinned to the screen. Top center
// (the default) drops below a sticky header if there is one; a bottom corner rises above a
// pinned ticket button or chat bubble. Failing that, it tries the other spots.
function place(card, preferred, obs) {
  const W = vw(), H = vh(), gap = 16, w = card.offsetWidth, h = card.offsetHeight, pad = 8;
  const narrow = W <= 600;
  const spots = {
    'bottom-left': { left: gap, top: H - gap - h },
    'bottom-right': { left: narrow ? gap : W - gap - w, top: H - gap - h },
    top: { left: (W - w) / 2, top: gap }
  };
  const hits = (s) => obs.some((o) => s.left < o.right + pad && s.left + w > o.left - pad && s.top < o.bottom + pad && s.top + h > o.top - pad);
  let pick = null, lift = 0, drop = 0;
  if (preferred === 'top') {
    if (!hits(spots.top)) pick = 'top';
    else {
      // A sticky header is in the way: sit just below it.
      const above = obs.filter((o) => o.bottom < H * 0.4 && spots.top.left < o.right && spots.top.left + w > o.left);
      const below = { left: spots.top.left, top: Math.max(...above.map((o) => o.bottom), 0) + gap };
      if (above.length && !hits(below)) { pick = 'top'; drop = below.top; }
    }
    if (!pick) pick = ['bottom-left', 'bottom-right'].find((k) => !hits(spots[k]));
  } else {
    const other = preferred === 'bottom-right' ? 'bottom-left' : 'bottom-right';
    pick = [preferred, other].find((k) => !hits(spots[k]));
    if (!pick) {
      // Sit just above whatever is pinned in the preferred corner, if that still leaves room.
      const s = spots[preferred];
      const under = obs.filter((o) => s.left < o.right + pad && s.left + w > o.left - pad && o.top > H * 0.5);
      const top = under.length ? Math.min(...under.map((o) => o.top)) : H;
      const raised = { left: s.left, top: top - gap - h };
      if (raised.top > H * 0.25 && !hits(raised)) { pick = preferred; lift = H - top; }
    }
    if (!pick && !hits(spots.top)) pick = 'top';
  }
  if (!pick) pick = preferred;
  card.classList.remove('bottom-left', 'bottom-right', 'top');
  card.classList.add(pick);
  if (lift) card.style.bottom = `${lift + gap}px`;
  if (drop) card.style.top = `${drop}px`;
}

function banner(root, egg, ctx, onClose, obs) {
  const card = document.createElement('div');
  card.className = `card ${ctx.position || 'top'}${egg.kind === 'quiet' ? ' quiet' : ''}`;
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  card.innerHTML = `<h2>${esc(egg.headline)}</h2>${egg.text ? `<p>${esc(egg.text)}</p>` : ''}` +
    (egg.link ? `<a href="${esc(egg.link.href)}">${esc(egg.link.label)}</a>` : '') +
    `<button type="button" aria-label="Close">×</button>`;
  root.appendChild(card);
  if (obs && obs.length) place(card, ctx.position || 'top', obs);
  card.querySelector('button').addEventListener('click', () => { track('delight_close', egg); onClose(); });
  const a = card.querySelector('a');
  if (a) a.addEventListener('click', () => track('delight_click', egg, { delight_link: egg.link.href }));
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
  return card;
}

// Shapes used by more than one effect.
export function drawGlasses(g, s, color) {
  g.strokeStyle = color; g.lineWidth = Math.max(1.5, s / 7);
  g.beginPath(); g.arc(-s * 0.55, 0, s * 0.42, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(s * 0.55, 0, s * 0.42, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-s * 0.14, -s * 0.05); g.quadraticCurveTo(0, -s * 0.3, s * 0.14, -s * 0.05); g.stroke();
}
export function drawStar(g, s, color) {
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.42 : s, a = (Math.PI / 5) * i - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fill();
}
