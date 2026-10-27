// Builds docs/delight.js from src/loader.js and docs/schedule.json.
// Usage: node scripts/build.mjs          (write docs/delight.js)
//        node scripts/build.mjs --check  (exit 1 if docs/delight.js is out of date or the schedule has errors)
//        node scripts/build.mjs --accept-collisions  (record today's shared days in docs/collisions.json)
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const schedule = JSON.parse(read('docs/schedule.json'));

// ---------- validate ----------
const effects = new Set(readdirSync(new URL('docs/effects/', root))
  .filter((f) => f.endsWith('.js') && !['lib.js', 'paint.js'].includes(f)).map((f) => f.replace(/\.js$/, '')));
effects.add('none');
const kinds = new Set(['anniversary', 'legacy', 'civic', 'seasonal', 'quiet', 'live', 'hidden']);
const errors = [];
const ids = new Set();
for (const e of schedule.eggs) {
  const where = `egg "${e.id}"`;
  if (!e.id || ids.has(e.id)) errors.push(`${where}: missing or duplicate id`);
  ids.add(e.id);
  if (!kinds.has(e.kind)) errors.push(`${where}: unknown kind "${e.kind}"`);
  if (!effects.has(e.effect)) errors.push(`${where}: no effect file docs/effects/${e.effect}.js`);
  const r = e.rule || {};
  const ok = (r.date && /^\d\d-\d\d$/.test(r.date)) || Array.isArray(r.nth) || r.election ||
    Array.isArray(r.dates) || ['aurora', 'snow'].includes(r.live) || typeof r.keyword === 'string';
  if (!ok) errors.push(`${where}: rule not understood ${JSON.stringify(r)}`);
  if (e.effect !== 'none' && !e.headline) errors.push(`${where}: needs a headline`);
  if (typeof e.priority !== 'number') errors.push(`${where}: needs a numeric priority`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// ---------- build ----------
// The loader carries only what it needs to pick today's delight. The words on screen and the
// effect options go in docs/eggs/<id>.json, fetched only on the day that delight plays.
// Notes and review status stay in schedule.json for the preview page.
const pickKeys = (e, keys) => Object.fromEntries(keys.filter((k) => e[k] !== undefined).map((k) => [k, e[k]]));
const rules = schedule.eggs.map((e) => pickKeys(e, ['id', 'kind', 'rule', 'span', 'effect', 'priority', 'enabled']));
const details = Object.fromEntries(schedule.eggs.map((e) => [e.id, pickKeys(e, ['title', 'options', 'headline', 'text', 'link', 'since', 'ago', 'milestone'])]));
const json = JSON.stringify(rules);

// Light minify: drop comments that sit on their own line and the indentation.
const minify = (src) => src.split('\n')
  .filter((l) => !/^\s*\/\/(?!!)/.test(l))
  .map((l) => l.trim()).filter(Boolean).join('\n')
  .replace(/^\/\*(?!!)[\s\S]*?\*\/\n?/gm, '');

const effectSrc = [...effects].filter((f) => f !== 'none').sort()
  .map((f) => read(`docs/effects/${f}.js`)).join('') + read('docs/effects/lib.js') + read('docs/effects/paint.js');
const version = createHash('sha1').update(json + JSON.stringify(details) + read('src/loader.js') + effectSrc).digest('hex').slice(0, 8);
const out = minify(read('src/loader.js')).replace('__SCHEDULE__', json).replace('__VERSION__', version) + '\n';

// ---------- shared days ----------
// Run the built loader for every day of the next ten years and list the days two or more delights
// share. The loader plays them on successive page views, but each pairing should be a choice:
// a new one stops the build until it is recorded in docs/collisions.json (--accept-collisions).
const sandbox = { window: {}, document: { currentScript: null, querySelector: () => null, readyState: 'loading', addEventListener() {} },
  location: { search: '', pathname: '/' }, URLSearchParams, sessionStorage: { getItem: () => null, setItem() {} }, console };
sandbox.window.top = sandbox.window; sandbox.window.self = sandbox.window; sandbox.window.addEventListener = () => {};
vm.runInNewContext(out, sandbox);
const D = sandbox.window.TRPLDelight, shared = {};
const y0 = new Date().getFullYear();
for (let d = new Date(y0, 0, 1); d.getFullYear() < y0 + 10; d.setDate(d.getDate() + 1)) {
  const list = D.match(new Date(d)).filter((e) => !e.rule.live && !e.rule.keyword);
  if (list.length < 2) continue;
  const key = list.map((e) => e.id).join(' > ');
  (shared[key] = shared[key] || []).push(d.toISOString().slice(0, 10));
}
const collisionsPath = new URL('docs/collisions.json', root);
const known = existsSync(collisionsPath) ? JSON.parse(readFileSync(collisionsPath, 'utf8')) : {};
const fresh = Object.keys(shared).filter((k) => !(k in known));
if (process.argv.includes('--accept-collisions')) {
  const next = {};
  for (const k of Object.keys(shared)) next[k] = known[k] || { note: 'Accepted ' + new Date().toISOString().slice(0, 10) + '. Top plays first, the rest on later page views.' };
  for (const k of Object.keys(next)) next[k].days = shared[k];
  writeFileSync(collisionsPath, JSON.stringify(next, null, 2) + '\n');
  console.log(`docs/collisions.json: ${Object.keys(next).length} shared-day pairings recorded.`);
} else if (fresh.length) {
  console.error('New shared days in the next ten years (highest priority first):\n' +
    fresh.map((k) => `  ${k}: ${shared[k].slice(0, 4).join(', ')}${shared[k].length > 4 ? ` (+${shared[k].length - 4} more)` : ''}`).join('\n') +
    '\nChange a rule or priority, or record them with: node scripts/build.mjs --accept-collisions');
  process.exit(1);
}

const files = new Map([['docs/delight.js', out]]);
for (const [id, d] of Object.entries(details)) files.set(`docs/eggs/${id}.json`, JSON.stringify(d) + '\n');

if (process.argv.includes('--check')) {
  const stale = [...files].filter(([p, c]) => !existsSync(new URL(p, root)) || readFileSync(new URL(p, root), 'utf8') !== c);
  if (stale.length) {
    console.error('Out of date: ' + stale.map(([p]) => p).join(', ') + '\nRun: node scripts/build.mjs');
    process.exit(1);
  }
  console.log('Build is up to date.');
} else {
  mkdirSync(new URL('docs/eggs/', root), { recursive: true });
  for (const f of readdirSync(new URL('docs/eggs/', root))) {
    if (!files.has(`docs/eggs/${f}`)) rmSync(new URL(`docs/eggs/${f}`, root));
  }
  for (const [p, c] of files) writeFileSync(new URL(p, root), c);
  console.log(`docs/delight.js: ${rules.length} delights, ${(out.length / 1024).toFixed(1)} KB, ` +
    `${(gzipSync(out).length / 1024).toFixed(1)} KB gzipped, version ${version}`);
}
