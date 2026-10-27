// No animation: just the banner. Used for quiet days that deserve a word but not a show.
import { play } from './lib.js';

export default (egg, ctx) => play(egg, ctx, null);
