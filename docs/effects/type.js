// Bold brand type: layered color bands of Dharma Gothic slide across the page.
// options: { lines: ["NOBEL", "PEACE PRIZE", "1906"] } (falls back to the headline)
import { play } from './lib.js';
import { typeBands } from './paint.js';

export default (egg, ctx) => play(egg, ctx, async (s) => {
  const lines = (egg.options && egg.options.lines) || [egg.headline];
  await typeBands(s, lines, { top: '38%', hold: 2800 });
});
