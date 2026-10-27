# Delight

Small surprises on trlibrary.com for the days that matter to Theodore Roosevelt's story: confetti on his birthday, pelicans on the Pelican Island anniversary, a bison herd crossing a painted Badlands ridge on National Bison Day. Served from GitHub Pages at `delight.labs.trlibrary.com`, with a preview page and the full schedule at the root.

## Add it to the site

One Custom HTML tag in Google Tag Manager, firing on All Pages:

```html
<script src="https://delight.labs.trlibrary.com/delight.js" async></script>
```

On a normal day the tag loads one small file (about 3 KB gzipped) that checks the date and stops. On a delight's day, it loads only that delight's words (a few hundred bytes) and its effect (5 to 15 KB). Everything waits until the page has finished loading.

Each delight plays once per visit. It can be closed, never plays sound, and never plays inside an embedded frame or on donate, checkout, ticketing, account or admin pages. Visitors who have reduced motion turned on see the message card without the animation. The animation layer sits underneath anything the site pins to the screen, so a ticket button or chat bubble stays visible and clickable.

| Option | Effect |
|---|---|
| `?delight=<id>` on any page | Plays that delight right away, on any day |
| `?delight-date=YYYY-MM-DD` | Acts as if it were that date |
| `?delight=off` / `?delight=on` | Turns delights off or back on for the rest of the visit |
| `data-position` on the tag | Where the message card sits: `top` (default), `bottom-left` or `bottom-right`. It moves on its own to stay clear of anything pinned to the screen (a ticket button, chat bubble, cookie bar or sticky header) |
| `data-style` on the tag | `photo` (default) lands real photographs on the artwork as white-bordered prints, where a delight has them; `painted` plays the artwork alone |
| `data-avoid` on the tag | CSS selectors of other elements the card should stay clear of |
| `data-exclude` on the tag | A pattern of page paths to skip, replacing the default list |

Each delight pushes `delight_view`, `delight_click` and `delight_close` to the GTM data layer with `delight_id`.

## The look

Painted artwork first, with real photographs layered on top as prints the way the brand guide uses photography (Library photos from the Acquia DAM, Wikimedia Commons filling gaps; see docs/img/CREDITS.md). The artwork has three ingredients, all drawn from the brand guide ("vibrant and organic, borrowing from the beauty of the Badlands"; "layered and graphical, with bold typographic gestures"):

- **Painted landscapes.** Generated fresh each time: Badlands buttes with uneven strata and lignite seams, light from the left, paper grain, haze that fades into the page. Variants for Devils Tower, a canyon, pine forest, prairie, river and sea, at dawn, day, dusk or night.
- **Living things.** Flocking birds (a murmuration, a V of ducks, pelicans flapping in a wave down their line), a grazing herd, a hiker, a train or steamship trailing steam, paddlers on the river.
- **Type bands.** Dharma Gothic in the brand's color pairings, sliding in at an angle like the brand posters.

| Effect | What it does | Options |
|---|---|---|
| `confetti` | Tumbling paper and curling streamers, with optional type | `lines`, `shapes` |
| `fireworks` | Shells and willows with trails over the Badlands at night | |
| `scene` | A painted landscape rises from the bottom with life in it; real photographs land on top as white-bordered prints | `photo` (one, or several for a montage), `kind`, `montage`, `time`, `sun`, `leaves`, `life`, `count`, `lines` |
| `branch` | An olive branch grows across the page, leaf by leaf | `lines` |
| `flag` | The American flag rises on its pole and waves | `lines` |
| `ink` | A parchment strip where words write themselves in ink | `words` |
| `flight` | Birds cross the top of the page | `kind` (`pelican`, `duck`, `flock`), `count` |
| `fall` | Snow, cottonwood leaves or book pages drifting with depth | `kind`, `palette` |
| `type` | Type bands only | `lines` |
| `aurora` | Northern lights across the top of the page | |
| `note` | The message card only | |

## Editing the schedule

Everything lives in `docs/schedule.json`. After editing it, run:

```bash
node scripts/build.mjs
```

That checks the schedule, writes `docs/delight.js` and the per-delight files in `docs/eggs/`, and prints the loader size. A GitHub Action fails if the built files don't match the schedule.

Rules: `{"date":"MM-DD"}`, `{"nth":[month, weekday 0=Sunday, n or -1 for last]}`, `{"election":true}`, `{"dates":["YYYY-MM-DD"]}` for days that move each year, `{"live":"aurora"}` or `{"live":"snow"}`, `{"keyword":"bully"}`. Add `"span": 7` to run for several days.

When two delights land on the same day, the higher `priority` wins. A `quiet` entry with `"effect": "none"` blocks every delight that day. These mark days that are not for celebrating, such as February 14, the day Roosevelt's mother and his wife Alice died in 1884.

`enabled: false` keeps a delight off the live site while it can still be previewed. `review` holds what still needs checking. Historical claims go through HistorianPanel before a delight is turned on.

## Live conditions

`.github/workflows/live.yml` runs `collector/live.py` every three hours and writes `docs/live.json`:

- `aurora`: NOAA's 3-day Kp forecast reaches 5 or more during tonight's dark hours over Medora (the "Possible" level in the Northern Lights Watch).
- `snow`: Open-Meteo forecasts at least 0.5 cm of snow in Medora today.

The loader reads `live.json` at most once per visit, only on days with no dated delight, and ignores it if it is more than 12 hours old. The workflow commits only when a flag changes or the file is getting old.

## Files

| Path | Purpose |
|---|---|
| `docs/index.html` | Preview page: today, a date simulator, the year ahead, every delight with a preview button, embed code |
| `docs/schedule.json` | The schedule (source of truth) |
| `docs/delight.js` | Built loader for GTM (do not edit; built from `src/loader.js`) |
| `docs/eggs/*.json` | Built words and options for each delight |
| `docs/effects/` | One file per effect, plus `lib.js` (stage and message card) and `paint.js` (landscapes, silhouettes, type bands) |
| `docs/live.json` | Live conditions |
| `collector/live.py` | Builds `live.json` (standard library only) |
| `scripts/build.mjs` | Validates the schedule and builds the loader (Node, no dependencies) |

## Run locally

```bash
node scripts/build.mjs
cd docs && python3 -m http.server 8000      # preview at http://localhost:8000
```

## GitHub Pages setup

1. Settings → Pages → Deploy from a branch → `main`, folder `/docs`.
2. Custom domain `delight.labs.trlibrary.com` (already in `docs/CNAME`; the wildcard DNS record covers it). Tick "Enforce HTTPS" once the certificate is issued.
3. Settings → Actions → General → Workflow permissions → Read and write (for the live conditions workflow).
