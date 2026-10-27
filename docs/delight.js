/*! TRPL Delight loader · delight.labs.trlibrary.com · built from src/loader.js — edit there, then run node scripts/build.mjs */
(function () {
'use strict';
if (window.TRPLDelight) return;
var EGGS = [{"id":"tr-birthday","kind":"anniversary","rule":{"date":"10-27"},"effect":"confetti","priority":30,"enabled":true},{"id":"kettle-hill","kind":"anniversary","rule":{"date":"07-01"},"effect":"type","priority":30,"enabled":false},{"id":"independence-day","kind":"anniversary","rule":{"date":"07-04"},"effect":"fireworks","priority":30,"enabled":true},{"id":"nobel-peace-prize","kind":"anniversary","rule":{"date":"12-10"},"effect":"type","priority":30,"enabled":true},{"id":"teddy-bear","kind":"anniversary","rule":{"date":"11-14"},"effect":"type","priority":30,"enabled":true},{"id":"badlands-arrival","kind":"anniversary","rule":{"date":"09-08"},"effect":"scene","priority":30,"enabled":false},{"id":"nd-statehood","kind":"anniversary","rule":{"date":"11-02"},"effect":"scene","priority":30,"enabled":true},{"id":"pelican-island","kind":"anniversary","rule":{"date":"03-14"},"effect":"flight","priority":30,"enabled":true},{"id":"antiquities-act","kind":"anniversary","rule":{"date":"06-08"},"effect":"type","priority":30,"enabled":true},{"id":"devils-tower","kind":"anniversary","rule":{"date":"09-24"},"effect":"scene","priority":30,"enabled":true},{"id":"grand-canyon","kind":"anniversary","rule":{"date":"01-11"},"effect":"scene","priority":30,"enabled":true},{"id":"forest-service","kind":"anniversary","rule":{"date":"02-01"},"effect":"scene","priority":30,"enabled":true},{"id":"earth-day","kind":"legacy","rule":{"date":"04-22"},"effect":"scene","priority":20,"enabled":true},{"id":"arbor-day","kind":"legacy","rule":{"nth":[4,5,-1]},"effect":"fall","priority":20,"enabled":true},{"id":"nps-birthday","kind":"legacy","rule":{"date":"08-25"},"effect":"type","priority":20,"enabled":true},{"id":"trnp-memorial-park","kind":"legacy","rule":{"date":"04-25"},"effect":"type","priority":20,"enabled":false},{"id":"trnp-national-park","kind":"legacy","rule":{"date":"11-10"},"effect":"type","priority":20,"enabled":false},{"id":"public-lands-day","kind":"legacy","rule":{"nth":[9,6,4]},"effect":"scene","priority":22,"enabled":true},{"id":"hunting-fishing-day","kind":"legacy","rule":{"nth":[9,6,4]},"effect":"scene","priority":21,"enabled":true},{"id":"refuge-week","kind":"legacy","rule":{"nth":[10,0,2]},"span":7,"effect":"flight","priority":18,"enabled":true},{"id":"migratory-bird-day","kind":"legacy","rule":{"nth":[5,6,2]},"effect":"flight","priority":20,"enabled":false},{"id":"world-wildlife-day","kind":"legacy","rule":{"date":"03-03"},"effect":"scene","priority":20,"enabled":true},{"id":"national-mammal","kind":"legacy","rule":{"date":"05-09"},"effect":"scene","priority":20,"enabled":true},{"id":"bison-day","kind":"legacy","rule":{"nth":[11,6,1]},"effect":"scene","priority":20,"enabled":true},{"id":"rivers-day","kind":"legacy","rule":{"nth":[9,0,4]},"effect":"scene","priority":20,"enabled":true},{"id":"trails-day","kind":"legacy","rule":{"nth":[6,6,1]},"effect":"scene","priority":20,"enabled":true},{"id":"ranger-day","kind":"legacy","rule":{"date":"07-31"},"effect":"type","priority":20,"enabled":true},{"id":"panama-canal","kind":"legacy","rule":{"date":"08-15"},"effect":"scene","priority":20,"enabled":true},{"id":"teddy-bear-day","kind":"legacy","rule":{"date":"09-09"},"effect":"type","priority":20,"enabled":true},{"id":"read-across-america","kind":"legacy","rule":{"date":"03-02"},"effect":"fall","priority":20,"enabled":false},{"id":"museum-day","kind":"legacy","rule":{"date":"05-18"},"effect":"type","priority":20,"enabled":true},{"id":"voter-registration-day","kind":"civic","rule":{"nth":[9,2,4]},"effect":"type","priority":20,"enabled":true},{"id":"constitution-day","kind":"civic","rule":{"date":"09-17"},"effect":"type","priority":20,"enabled":true},{"id":"election-day","kind":"civic","rule":{"election":true},"effect":"type","priority":25,"enabled":true},{"id":"presidents-day","kind":"seasonal","rule":{"nth":[2,1,3]},"effect":"type","priority":20,"enabled":true},{"id":"thanksgiving","kind":"seasonal","rule":{"nth":[11,4,4]},"effect":"fall","priority":20,"enabled":true},{"id":"christmas","kind":"seasonal","rule":{"date":"12-24"},"span":2,"effect":"fall","priority":20,"enabled":true},{"id":"veterans-day","kind":"quiet","rule":{"date":"11-11"},"effect":"note","priority":90,"enabled":true},{"id":"quiet-feb-14","kind":"quiet","rule":{"date":"02-14"},"effect":"none","priority":100,"enabled":true},{"id":"quiet-jan-6","kind":"quiet","rule":{"date":"01-06"},"effect":"none","priority":100,"enabled":true},{"id":"quiet-sep-14","kind":"quiet","rule":{"date":"09-14"},"effect":"none","priority":100,"enabled":true},{"id":"quiet-oct-14","kind":"quiet","rule":{"date":"10-14"},"effect":"none","priority":100,"enabled":true},{"id":"aurora-tonight","kind":"live","rule":{"live":"aurora"},"effect":"aurora","priority":10,"enabled":true},{"id":"snow-in-medora","kind":"live","rule":{"live":"snow"},"effect":"fall","priority":9,"enabled":true},{"id":"bully","kind":"hidden","rule":{"keyword":"bully"},"effect":"confetti","priority":0,"enabled":true}];
var VERSION = '68fdde1e';
var script = document.currentScript || document.querySelector('script[src*="delight.js"]');
var src = (script && script.src) || 'https://delight.labs.trlibrary.com/delight.js';
var BASE = src.replace(/[^/]*(\?.*)?$/, '');
var attr = function (n) { return script ? script.getAttribute('data-' + n) : null; };
var EXCLUDE = new RegExp(attr('exclude') ||
'^/(donate|give|support/donate|checkout|cart|tickets|user|admin)(/|$)|/edit$|/node/add');
var AUTOPLAY = attr('autoplay') !== 'off';
var POSITION = attr('position') || 'bottom-left';
var qs = new URLSearchParams(location.search);
var store = {
get: function (k) { try { return sessionStorage.getItem('trpl-delight:' + k); } catch (e) { return null; } },
set: function (k, v) { try { sessionStorage.setItem('trpl-delight:' + k, v); } catch (e) {} }
};
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function day(y, m, d) { return new Date(y, m - 1, d); }
function nth(y, m, wd, n) {
if (n === -1) {
var last = day(y, m + 1, 0);
return day(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7));
}
var first = day(y, m, 1);
return day(y, m, 1 + ((wd - first.getDay() + 7) % 7) + (n - 1) * 7);
}
function startIn(egg, y) {
var r = egg.rule;
if (r.date) { var p = r.date.split('-'); return day(y, +p[0], +p[1]); }
if (r.nth) return nth(y, r.nth[0], r.nth[1], r.nth[2]);
if (r.election) { var mon = nth(y, 11, 1, 1); return day(y, 11, mon.getDate() + 1); }
if (r.dates) {
for (var i = 0; i < r.dates.length; i++) if (+r.dates[i].slice(0, 4) === y) {
var q = r.dates[i].split('-'); return day(+q[0], +q[1], +q[2]);
}
}
return null;
}
function onDate(egg, d) {
var span = egg.span || 1;
for (var y = d.getFullYear() - 1; y <= d.getFullYear(); y++) {
var s = startIn(egg, y);
if (s && d >= s && d < day(s.getFullYear(), s.getMonth() + 1, s.getDate() + span)) return true;
}
return false;
}
function match(d, live, includeOff) {
d = d ? (typeof d === 'string' ? day(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10)) : d) : new Date();
d = day(d.getFullYear(), d.getMonth() + 1, d.getDate());
return EGGS.filter(function (e) {
if (!includeOff && !e.enabled) return false;
if (e.rule.live) return !!(live && live[e.rule.live]);
return onDate(e, d);
}).sort(function (a, b) { return b.priority - a.priority; });
}
function next(egg, from) {
from = from || new Date();
from = day(from.getFullYear(), from.getMonth() + 1, from.getDate());
for (var y = from.getFullYear() - 1; y <= from.getFullYear() + 2; y++) {
var s = startIn(egg, y);
if (!s) continue;
var end = day(s.getFullYear(), s.getMonth() + 1, s.getDate() + (egg.span || 1));
if (end > from) return s;
}
return null;
}
var running = false;
function run(id, opts) {
var egg = typeof id === 'string' ? EGGS.filter(function (e) { return e.id === id; })[0] : id;
if (!egg || egg.effect === 'none' || running) return Promise.resolve(false);
running = true;
var v = '?v=' + VERSION;
return Promise.all([
fetch(BASE + 'eggs/' + egg.id + '.json' + v).then(function (r) { return r.json(); }),
import(BASE + 'effects/' + egg.effect + '.js' + v)
]).then(function (res) {
var full = {};
for (var k in egg) full[k] = egg[k];
for (k in res[0]) full[k] = res[0][k];
return res[1].default(full, { base: BASE, position: (opts && opts.position) || POSITION, preview: !!(opts && opts.preview) });
}).then(function () { running = false; return true; }, function (err) {
running = false; if (window.console) console.warn('[TRPL delight]', err); return false;
});
}
window.TRPLDelight = { version: VERSION, eggs: EGGS, match: match, next: next, run: run, base: BASE };
if (!AUTOPLAY || window.top !== window.self) return;
if (qs.get('delight') === 'off') store.set('off', '1');
if (qs.get('delight') === 'on') store.set('off', '');
if (store.get('off') === '1' || EXCLUDE.test(location.pathname)) return;
function playFirst(list) {
var egg = list[0];
if (!egg || egg.kind === 'quiet' && egg.effect === 'none') return false;
if (store.get('seen:' + egg.id)) return true;
store.set('seen:' + egg.id, '1');
run(egg);
return true;
}
function go() {
var force = qs.get('delight');
if (force && force !== 'on' && force !== 'off') { run(force, { preview: true }); return; }
var list = match(qs.get('delight-date') || null);
if (list.length) { playFirst(list); return; }
if (EGGS.some(function (e) { return e.enabled && e.rule.live; })) {
var cached = store.get('live');
var use = function (live) {
var fresh = live && live.updated && (Date.now() - Date.parse(live.updated)) < 12 * 3600e3;
if (fresh) playFirst(match(null, live));
};
if (cached) { try { use(JSON.parse(cached)); } catch (e) {} }
else fetch(BASE + 'live.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
.then(function (live) { store.set('live', JSON.stringify(live || {})); use(live); }, function () {});
}
}
var words = EGGS.filter(function (e) { return e.enabled && e.rule.keyword; });
if (words.length) {
var typed = '';
document.addEventListener('keydown', function (ev) {
var t = ev.target;
if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
if (!ev.key || ev.key.length !== 1) return;
typed = (typed + ev.key.toLowerCase()).slice(-24);
words.forEach(function (e) {
var w = e.rule.keyword;
if (typed.slice(-w.length) === w) { typed = ''; run(e); }
});
});
}
var start = function () { (window.requestIdleCallback || setTimeout)(go, { timeout: 1500 }); };
if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
