/**
 * Generate the matches the Game Score Live stories replay: `src/data/syntheticMatches.json`.
 *
 * Every point is played through the factory's ScoringEngine from a fixed seed, so the server
 * sequence is the engine's own and the file is byte-identical on every run. The players are
 * fictional.
 *
 * Why this exists: the stories used to replay real matches from third-party CC BY-NC-SA match data.
 * Non-commercial + share-alike terms cannot ride in an MIT repo whose Storybook is published, and
 * renaming or reshuffling that data would still be an adaptation of it. These matches are ours.
 *
 * Each point carries exactly what the stories read: `winner`, `server`, `result` (a key of the
 * story's RESULT_MAP), `error` (the error type shown beside an error result, else null) and
 * `rallyLength`.
 *
 * Usage: node scripts/generateSyntheticMatches.mjs
 */
import { scoreGovernor } from 'tods-competition-factory';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import path from 'node:path';
import fs from 'node:fs';

const { ScoringEngine } = scoreGovernor;
const FORMAT = 'SET3-S:6/TB7';

const MATCHES = [
  { seed: 11, players: ['Avery Lindqvist', 'Mateo Okafor'], edge: 0.53 },
  { seed: 29, players: ['Ines Varga', 'Tomas Rehnquist'], edge: 0.5 },
  { seed: 47, players: ['Kenji Arbuckle', 'Lucien Mbeki'], edge: 0.55 },
  { seed: 83, players: ['Sofia Tremblay', 'Noor Castellanos'], edge: 0.48 }
];

/** mulberry32: small, fast, deterministic. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, weighted) {
  let roll = random() * weighted.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, weight] of weighted) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return weighted.at(-1)[0];
}

const SERVER_WINS = [
  ['Ace', 10],
  ['Serve Winner', 12],
  ['Winner', 30],
  ['Forced Error', 24],
  ['Unforced Error', 24]
];
const RETURNER_WINS = [
  ['Double Fault', 9],
  ['Winner', 33],
  ['Forced Error', 24],
  ['Unforced Error', 34]
];
const ERROR_TYPES = [
  ['Net', 44],
  ['Out Long', 25],
  ['Out Wide', 20],
  ['Out Wide and Long', 2]
];

function rallyLengthFor(result, random) {
  if (result === 'Ace' || result === 'Serve Winner') return 1;
  if (result === 'Double Fault') return 0;
  // most rallies are short; a few run long
  return 2 + Math.floor(random() ** 2 * 14);
}

function errorFor(result, random) {
  if (result !== 'Forced Error' && result !== 'Unforced Error') return null;
  return pick(random, ERROR_TYPES);
}

function playMatch({ seed, players, edge }, matchId) {
  const random = rng(seed);
  const engine = new ScoringEngine({ matchUpFormat: FORMAT });
  const points = [];

  for (let n = 0; n < 800 && !engine.isComplete(); n++) {
    const server = engine.getNextServer();
    // the server wins about 63% of points; `edge` tilts the match toward player 0
    const holdBias = server === 0 ? edge - 0.5 : 0.5 - edge;
    const serverWins = random() < 0.63 + holdBias;
    const winner = serverWins ? server : 1 - server;
    const result = pick(random, serverWins ? SERVER_WINS : RETURNER_WINS);
    const rallyLength = rallyLengthFor(result, random);
    const error = errorFor(result, random);
    engine.addPoint({ winner, server, result, rallyLength });
    points.push({ winner, server, result, error, rallyLength });
  }
  if (!engine.isComplete()) throw new Error(`match ${matchId} did not complete`);

  const score = engine
    .getScore()
    .sets.map((s) => `${s.side1Score ?? 0}-${s.side2Score ?? 0}`)
    .join(', ');

  return { matchId, players, score, points };
}

const out = MATCHES.map((match, i) => playMatch(match, i));
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/syntheticMatches.json');
// format with the repo's prettier config so `pnpm format:check` (which covers src/) stays clean
const options = { ...(await prettier.resolveConfig(target)), filepath: target };
fs.writeFileSync(target, await prettier.format(JSON.stringify(out), options));
for (const m of out) console.log(m.players.join(' v '), m.score, `${m.points.length} points`);
