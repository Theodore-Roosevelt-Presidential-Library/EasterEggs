/*! TRPL Delight loader · delight.labs.trlibrary.com · built from src/loader.js — edit there, then run node scripts/build.mjs */
(function () {
  'use strict';
  if (window.TRPLDelight) return;

  // Filled in by scripts/build.mjs from docs/schedule.json (copy, rules, effect and options only).
  var EGGS = __SCHEDULE__;
  var VERSION = '__VERSION__';

  var script = document.currentScript || document.querySelector('script[src*="delight.js"]');
  var src = (script && script.src) || 'https://delight.labs.trlibrary.com/delight.js';
  var BASE = src.replace(/[^/]*(\?.*)?$/, '');
  var attr = function (n) { return script ? script.getAttribute('data-' + n) : null; };

  // Where delights never play: giving, checkout, account and admin pages, and the editor.
  var EXCLUDE = new RegExp(attr('exclude') ||
    '^/(donate|give|support/donate|checkout|cart|tickets|user|admin)(/|$)|/edit$|/node/add');
  var AUTOPLAY = attr('autoplay') !== 'off';
  var POSITION = attr('position') || 'top';

  var qs = new URLSearchParams(location.search);
  var store = {
    get: function (k) { try { return sessionStorage.getItem('trpl-delight:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem('trpl-delight:' + k, v); } catch (e) {} }
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function day(y, m, d) { return new Date(y, m - 1, d); }

  // nth weekday of a month (n = -1 for the last one). weekday: 0 = Sunday.
  function nth(y, m, wd, n) {
    if (n === -1) {
      var last = day(y, m + 1, 0);
      return day(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7));
    }
    var first = day(y, m, 1);
    return day(y, m, 1 + ((wd - first.getDay() + 7) % 7) + (n - 1) * 7);
  }

  // Start date of an egg in a given year, or null if its rule is not date based.
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

  // Everything that matches a date, highest priority first. includeOff shows disabled eggs too (preview).
  function match(d, live, includeOff) {
    d = d ? (typeof d === 'string' ? day(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10)) : d) : new Date();
    d = day(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return EGGS.filter(function (e) {
      if (!includeOff && !e.enabled) return false;
      if (e.rule.live) return !!(live && live[e.rule.live]);
      return onDate(e, d);
    }).sort(function (a, b) { return b.priority - a.priority; });
  }

  // Next date (on or after `from`) an egg plays. Used by the preview page.
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
    // The words and options for this delight, and its effect, load only now.
    return Promise.all([
      fetch(BASE + 'eggs/' + egg.id + '.json' + v).then(function (r) { return r.json(); }),
      import(BASE + 'effects/' + egg.effect + '.js' + v)
    ]).then(function (res) {
      var full = {};
      for (var k in egg) full[k] = egg[k];
      for (k in res[0]) full[k] = res[0][k];
      return res[1].default(full, { base: BASE, position: (opts && opts.position) || POSITION, avoid: attr('avoid'), preview: !!(opts && opts.preview) });
    }).then(function () { running = false; return true; }, function (err) {
      running = false; if (window.console) console.warn('[TRPL delight]', err); return false;
    });
  }

  window.TRPLDelight = { version: VERSION, eggs: EGGS, match: match, next: next, run: run, base: BASE };

  // ---------- automatic play on the live site ----------
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
    // ?delight=<id> previews one egg anywhere; ?delight-date=YYYY-MM-DD simulates a day.
    var force = qs.get('delight');
    if (force && force !== 'on' && force !== 'off') { run(force, { preview: true }); return; }

    var list = match(qs.get('delight-date') || null);
    if (list.length) { playFirst(list); return; }

    // No dated egg today: check the live conditions file, at most once per visit.
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

  // Hidden keyword eggs: type the word anywhere outside a form field.
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
