#!/usr/bin/env node
/**
 * Generates the time zone picker's map data (src/components/timezone-picker/data/*.ts) from public sources.
 * The output is committed; run this only to refresh it.
 *
 *   node scripts/buildTimeZoneMap.mjs <source-dir>
 *
 * <source-dir> holds, downloaded by hand:
 *   land-110m.json       https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json (Natural Earth, public domain)
 *   time_zones.geojson  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_time_zones.geojson
 *                       (Natural Earth, public domain)
 *   zone.tab, backward  https://raw.githubusercontent.com/eggert/tz/main/{zone.tab,backward} (IANA tz, public domain)
 *
 * The map is equirectangular, one unit per degree: x = lon + 180, y = TOP - lat, cropped to the latitudes people live
 * in. Outlines are simplified (Douglas–Peucker) to a fraction of a degree; at picker sizes that is under a pixel.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TOP = 84;
const BOTTOM = -58;
const LAND_TOLERANCE = 0.1;
const BAND_TOLERANCE = 0.25;

const [sourceDir] = process.argv.slice(2);
if (!sourceDir) {
  console.error('usage: node scripts/buildTimeZoneMap.mjs <source-dir>');
  process.exit(2);
}
const read = (name) => readFileSync(path.join(sourceDir, name), 'utf8');
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/components/timezone-picker/data');

const project = ([lon, lat]) => [lon + 180, TOP - Math.max(BOTTOM, Math.min(TOP, lat))];

function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    let max = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      // a closed ring's ends coincide: measure from that point rather than a line of no length
      const distance = length ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / length : Math.hypot(px - ax, py - ay);
      if (distance > max) [max, index] = [distance, i];
    }
    if (max > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round(n * 10) / 10;

/**
 * A ring that crosses the antimeridian jumps from one edge of the map to the other, and drawn as it is the jump is a
 * line across the world. Unwrapped, its longitudes run on past ±180 instead; the copy shifted a world over draws the
 * part beyond the edge, and the map's own bounds clip both.
 */
function unwrap(ring) {
  let shift = 0;
  return ring.map(([lon, lat], i) => {
    if (i) {
      const jump = lon + shift - (ring[i - 1][0] + shift);
      if (jump > 180) shift -= 360;
      else if (jump < -180) shift += 360;
    }
    return [lon + shift, lat];
  });
}

/** One closed ring as path commands, with its copy across the antimeridian where it has one. */
function ringPath(ring, tolerance) {
  const unwrapped = unwrap(ring);
  const lons = unwrapped.map(([lon]) => lon);
  const copies = [0];
  if (Math.min(...lons) < -180) copies.push(360);
  if (Math.max(...lons) > 180) copies.push(-360);
  return copies
    .map((offset) =>
      ringCommands(
        unwrapped.map(([lon, lat]) => [lon + offset, lat]),
        tolerance
      )
    )
    .join('');
}

/** Relative path commands; rings that simplify to a sliver are dropped. */
function ringCommands(ring, tolerance) {
  const points = simplify(ring.map(project), tolerance).map(([x, y]) => [round(x), round(y)]);
  if (points.length < 4) return '';
  let [px, py] = points[0];
  let d = `M${px} ${py}`;
  for (const [x, y] of points.slice(1)) {
    const rx = round(x - px);
    const ry = round(y - py);
    if (rx || ry) d += `l${rx} ${ry}`;
    [px, py] = [x, y];
  }
  return `${d}z`;
}

// ── land (TopoJSON: quantized, delta-encoded arcs) ─────────────────────
const topology = JSON.parse(read('land-110m.json'));
const { scale, translate } = topology.transform;
const arcs = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const arcPoints = (index) => (index < 0 ? [...arcs[~index]].reverse() : arcs[index]);
const ringFromArcs = (indexes) => indexes.flatMap((index, i) => (i ? arcPoints(index).slice(1) : arcPoints(index)));
const land = topology.objects.land.geometries.flatMap((geometry) =>
  geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs
);
const landPath = land
  .flatMap((polygon) => polygon.map((ring) => ringPath(ringFromArcs(ring), LAND_TOLERANCE)))
  .join('');

// ── offset bands (standard-time offset in hours, e.g. -5, 5.5) ─────────
const bands = new Map();
for (const feature of JSON.parse(read('time_zones.geojson')).features) {
  const offset = Number(feature.properties.zone);
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  const d = polygons.flatMap((polygon) => polygon.map((ring) => ringPath(ring, BAND_TOLERANCE))).join('');
  if (d) bands.set(offset, (bands.get(offset) ?? '') + d);
}
const offsetBands = [...bands.entries()].sort(([a], [b]) => a - b).map(([offset, d]) => ({ offset, d }));

// ── zone locations (zone.tab: country, ISO 6709 coordinates, zone) ─────
const iso6709 = (text) => {
  const [, latSign, latDigits, lonSign, lonDigits] = text.match(/^([+-])(\d+)([+-])(\d+)$/);
  const degrees = (digits, degreeDigits) => {
    const d = Number(digits.slice(0, degreeDigits));
    const m = Number(digits.slice(degreeDigits, degreeDigits + 2));
    const s = Number(digits.slice(degreeDigits + 2, degreeDigits + 4) || 0);
    return d + m / 60 + s / 3600;
  };
  const lat = degrees(latDigits, 2) * (latSign === '-' ? -1 : 1);
  const lon = degrees(lonDigits, 3) * (lonSign === '-' ? -1 : 1);
  // Antarctic stations lie below the crop: they sit on its bottom edge
  return project([lon, lat]).map(round);
};
const locations = {};
for (const line of read('zone.tab').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const [country, coordinates, zone] = line.split('\t');
  const [x, y] = iso6709(coordinates);
  locations[zone] = [x, y, country];
}
// a runtime may name a zone by its old alias (Chrome: Asia/Calcutta); each alias points at its canonical zone
const aliases = {};
for (const line of read('backward').split('\n')) {
  const match = line.match(/^Link\s+(\S+)\s+(\S+)/);
  if (match && locations[match[1]] && !locations[match[2]]) aliases[match[2]] = match[1];
}

const header = (source) => `/* Generated by scripts/buildTimeZoneMap.mjs from ${source}. Do not edit by hand. */\n`;
// the zone table repeats itself (country codes, alias targets) by nature
const REPEATS = `/* eslint-disable sonarjs/no-duplicate-string */\n`;
/** Written as prettier would write it, so a regeneration diffs only where the data changed. */
async function writeFormatted(file, source) {
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(file)) ?? {};
  writeFileSync(file, await prettier.format(source, { ...options, filepath: file }));
}
const width = 360;
const height = TOP - BOTTOM;

await writeFormatted(
  path.join(outDir, 'worldMap.ts'),
  `${header('Natural Earth (public domain)')}` +
    `export const MAP_WIDTH = ${width};\nexport const MAP_HEIGHT = ${height};\n` +
    `export const LAND_PATH =\n  ${JSON.stringify(landPath)};\n` +
    `/** Standard-time offset bands, in hours east of UTC. */\n` +
    `export const OFFSET_BANDS: ReadonlyArray<{ offset: number; d: string }> = ${JSON.stringify(offsetBands)};\n`
);
await writeFormatted(
  path.join(outDir, 'zoneLocations.ts'),
  `${header('the IANA tz database zone.tab and backward (public domain)')}${REPEATS}` +
    `/** Map position [x, y] (see worldMap.ts) and ISO 3166 country of each zone's principal location. */\n` +
    `export const ZONE_LOCATIONS: Readonly<Record<string, readonly [number, number, string]>> = ${JSON.stringify(locations)};\n` +
    `/** Old names a runtime may still report, to the zone each now names. */\n` +
    `export const ZONE_ALIASES: Readonly<Record<string, string>> = ${JSON.stringify(aliases)};\n`
);
console.log(
  `land ${landPath.length} chars, ${offsetBands.length} bands ${offsetBands.reduce((n, b) => n + b.d.length, 0)} chars, ` +
    `${Object.keys(locations).length} zones, ${Object.keys(aliases).length} aliases`
);
