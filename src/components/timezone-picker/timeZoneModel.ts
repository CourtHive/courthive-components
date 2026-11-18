/**
 * The time zone picker's model: what each IANA zone is called, where it is, and how a director finds it.
 *
 * The stored value is always the IANA id (`America/New_York`): it is what carries daylight saving and history.
 * Everything here is presentation of that id — a city, the zone's own name in the director's language
 * ("Eastern Time"), its country, its offset now — and a search over all of them. Pure: no DOM.
 */

export interface TimeZoneOption {
  /** The IANA id, as the runtime or the caller named it. */
  timeZone: string;
  /** The zone's principal city: `New York`. */
  city: string;
  /** The zone's generic name in the locale (`Eastern Time`); empty when the runtime knows it only as an offset. */
  name: string;
  country?: string;
  countryCode?: string;
  /** Minutes east of UTC, at the moment the options were built. */
  offsetMinutes: number;
  /** Minutes east of UTC outside daylight saving: the band the zone sits in on the map. */
  standardOffsetMinutes: number;
  /** `UTC−5`, `UTC+5:30`, `UTC`. */
  offsetLabel: string;
  /** `EST`, where the locale has an abbreviation for the zone. */
  abbreviation?: string;
  /** Map position (see `data/worldMap.ts`), when the tz database places the zone. */
  location?: readonly [number, number];
  /** Lower-cased, accent-free text the search matches against. */
  search: string;
}

/** Map positions and countries, from `data/zoneLocations.ts` (loaded with the map). */
export interface ZoneLocations {
  locations: Readonly<Record<string, readonly [number, number, string]>>;
  aliases: Readonly<Record<string, string>>;
}

const MINUS = '−';
const OFFSET_PATTERN = /^(?:GMT|UTC)(?:([+-−])(\d{1,2})(?::?(\d{2}))?)?$/;

/** The runtime's zones, with UTC (which `supportedValuesOf` leaves out). Only UTC on a runtime without the API. */
export function runtimeTimeZones(): string[] {
  const intl = Intl as any;
  if (typeof intl.supportedValuesOf !== 'function') return ['UTC'];
  try {
    const zones: string[] = intl.supportedValuesOf('timeZone');
    return zones.includes('UTC') ? zones : ['UTC', ...zones];
  } catch {
    return ['UTC'];
  }
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timeZone.trim() });
    return true;
  } catch {
    return false;
  }
}

function zoneNamePart(timeZone: string, locale: string | undefined, style: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style as any }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Minutes east of UTC for `timeZone` at `date`. */
export function offsetMinutesAt(timeZone: string, date: Date): number {
  const match = OFFSET_PATTERN.exec(zoneNamePart(timeZone, 'en-US', 'shortOffset', date));
  if (!match?.[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '+' ? minutes : -minutes;
}

/** The offset outside daylight saving: the lesser of January's and July's (DST only ever adds). */
export function standardOffsetMinutes(timeZone: string, date: Date): number {
  const year = date.getUTCFullYear();
  return Math.min(
    offsetMinutesAt(timeZone, new Date(Date.UTC(year, 0, 1))),
    offsetMinutesAt(timeZone, new Date(Date.UTC(year, 6, 1)))
  );
}

export function formatOffset(minutes: number): string {
  if (!minutes) return 'UTC';
  const sign = minutes > 0 ? '+' : MINUS;
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  const minutesPart = rest ? ':' + String(rest).padStart(2, '0') : '';
  return `UTC${sign}${hours}${minutesPart}`;
}

/** The local time in `timeZone`, as the locale writes a time of day. */
export function formatLocalTime(timeZone: string, date: Date, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
  } catch {
    return '';
  }
}

export function zoneCity(timeZone: string): string {
  if (timeZone === 'UTC') return 'UTC';
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}

/** Lower-case, accents removed, the typographic minus read as a hyphen: what the director types matches what is shown. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/−/g, '-').toLowerCase().trim();
}

const isOffsetName = (name: string) => /^(GMT|UTC)([+-−]|$)/.test(name);

function regionNames(locale?: string): ((code: string) => string | undefined) | undefined {
  try {
    const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'region' });
    return (code) => {
      try {
        return names.of(code);
      } catch {
        return undefined;
      }
    };
  } catch {
    return undefined;
  }
}

export function locateZone(timeZone: string, zones?: ZoneLocations): readonly [number, number, string] | undefined {
  if (!zones) return undefined;
  return zones.locations[timeZone] ?? zones.locations[zones.aliases[timeZone]];
}

export function buildTimeZoneOption(
  timeZone: string,
  {
    date,
    locale,
    zones,
    country
  }: { date: Date; locale?: string; zones?: ZoneLocations; country?: (code: string) => string | undefined }
): TimeZoneOption {
  const offsetMinutes = offsetMinutesAt(timeZone, date);
  const longName = zoneNamePart(timeZone, locale, 'longGeneric', date);
  const shortName = zoneNamePart(timeZone, locale, 'short', date);
  const located = locateZone(timeZone, zones);
  const countryCode = located?.[2];
  // a runtime may name the zone by an old alias (Asia/Calcutta): show today's city, keep the id it gave
  const canonical = zones?.aliases[timeZone];
  const option: TimeZoneOption = {
    timeZone,
    city: zoneCity(canonical ?? timeZone),
    name: timeZone === 'UTC' ? 'Coordinated Universal Time' : isOffsetName(longName) ? '' : longName,
    offsetMinutes,
    standardOffsetMinutes: standardOffsetMinutes(timeZone, date),
    offsetLabel: formatOffset(offsetMinutes),
    search: ''
  };
  if (shortName && !isOffsetName(shortName)) option.abbreviation = shortName;
  if (located) option.location = [located[0], located[1]];
  if (countryCode) {
    option.countryCode = countryCode;
    option.country = country?.(countryCode) ?? countryCode;
  }
  option.search = normalizeSearch(
    [timeZone, canonical, option.city, option.name, option.country, countryCode, option.abbreviation]
      .filter(Boolean)
      .join(' | ')
      .replace(/[_/]/g, ' ')
  );
  return option;
}

/** One option per zone, ordered west to east and then by city. */
export function buildTimeZoneOptions({
  timeZones = runtimeTimeZones(),
  date = new Date(),
  locale,
  zones
}: {
  timeZones?: string[];
  date?: Date;
  locale?: string;
  zones?: ZoneLocations;
} = {}): TimeZoneOption[] {
  const country = regionNames(locale);
  return [...new Set(timeZones)]
    .filter(isValidTimeZone)
    .map((timeZone) => buildTimeZoneOption(timeZone, { date, locale, zones, country }))
    .sort(
      (a, b) =>
        a.offsetMinutes - b.offsetMinutes || a.city.localeCompare(b.city) || a.timeZone.localeCompare(b.timeZone)
    );
}

/** `New York · Eastern Time (UTC−5)`: what the field shows for a chosen zone. */
export function timeZoneDisplay(option: TimeZoneOption): string {
  if (option.timeZone === 'UTC') return 'UTC';
  return option.name
    ? `${option.city} · ${option.name} (${option.offsetLabel})`
    : `${option.city} (${option.offsetLabel})`;
}

/** `utc-5`, `gmt+5:30`, `+5:30`, `-5` → minutes; undefined when the token is not an offset. */
function offsetToken(token: string): number | undefined {
  const match = /^(?:utc|gmt)?([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(token);
  if (!match) return token === 'utc' || token === 'gmt' ? 0 : undefined;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '+' ? minutes : -minutes;
}

/**
 * The options matching every word of `query`, best first: a city that starts with the query, then a word that does,
 * then any match. An offset (`-5`, `UTC+5:30`) matches a zone at that offset now or in standard time.
 */
export function searchTimeZones(options: TimeZoneOption[], query: string): TimeZoneOption[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return options;
  const tokens = normalized.split(/\s+/);
  const ranked: Array<{ option: TimeZoneOption; rank: number; index: number }> = [];
  options.forEach((option, index) => {
    const matches = tokens.every((token) => {
      const offset = offsetToken(token);
      if (offset !== undefined) return option.offsetMinutes === offset || option.standardOffsetMinutes === offset;
      return option.search.includes(token);
    });
    if (!matches) return;
    const city = normalizeSearch(option.city);
    const rank = city.startsWith(normalized)
      ? 0
      : option.search.split(/[\s|]+/).some((word) => word.startsWith(tokens[0]))
        ? 1
        : 2;
    ranked.push({ option, rank, index });
  });
  return ranked.sort((a, b) => a.rank - b.rank || a.index - b.index).map(({ option }) => option);
}

/**
 * The zone nearest a point on the map. Given the band under the point, zones in that band are preferred, so a click
 * in eastern Ohio finds New York's zone rather than Chicago's; off the land, only a zone within `reach` is returned.
 */
export function nearestTimeZone(
  options: TimeZoneOption[],
  [x, y]: readonly [number, number],
  { bandOffsetMinutes, reach = 6 }: { bandOffsetMinutes?: number; reach?: number } = {}
): TimeZoneOption | undefined {
  const located = options.filter((option) => option.location);
  const inBand =
    bandOffsetMinutes === undefined
      ? []
      : located.filter((option) => option.standardOffsetMinutes === bandOffsetMinutes);
  const candidates = inBand.length ? inBand : located;
  let best: TimeZoneOption | undefined;
  let bestDistance = Infinity;
  for (const option of candidates) {
    const [ox, oy] = option.location!;
    const distance = Math.hypot(ox - x, oy - y);
    if (distance < bestDistance) [best, bestDistance] = [option, distance];
  }
  if (!inBand.length && bestDistance > reach) return undefined;
  return best;
}
