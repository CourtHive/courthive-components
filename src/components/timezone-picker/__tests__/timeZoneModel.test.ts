import { ZONE_ALIASES, ZONE_LOCATIONS } from '../data/zoneLocations';
import { MAP_HEIGHT, MAP_WIDTH, OFFSET_BANDS } from '../data/worldMap';
import { describe, expect, it } from 'vitest';
import {
  buildTimeZoneOptions,
  formatOffset,
  nearestTimeZone,
  offsetMinutesAt,
  searchTimeZones,
  standardOffsetMinutes,
  timeZoneDisplay
} from '../timeZoneModel';

const NEW_YORK = 'America/New_York';
const CHICAGO = 'America/Chicago';
const BOGOTA = 'America/Bogota';
const KOLKATA = 'Asia/Kolkata';
const CALCUTTA = 'Asia/Calcutta';
const KATHMANDU = 'Asia/Kathmandu';
const PARIS = 'Europe/Paris';
const SYDNEY = 'Australia/Sydney';
const zones = { locations: ZONE_LOCATIONS, aliases: ZONE_ALIASES };
const WINTER = new Date('2026-01-15T12:00:00Z');
const SUMMER = new Date('2026-07-15T12:00:00Z');
const ZONES = ['UTC', NEW_YORK, CHICAGO, BOGOTA, KOLKATA, CALCUTTA, KATHMANDU, PARIS, SYDNEY];
const options = (date = WINTER) => buildTimeZoneOptions({ timeZones: ZONES, date, locale: 'en-US', zones });
const find = (date: Date, timeZone: string) => options(date).find((option) => option.timeZone === timeZone)!;
const ids = (list: { timeZone: string }[]) => list.map((option) => option.timeZone);

describe('time zone offsets', () => {
  it('reads the offset in force, and the standard offset beneath daylight saving', () => {
    expect(offsetMinutesAt(NEW_YORK, WINTER)).toBe(-300);
    expect(offsetMinutesAt(NEW_YORK, SUMMER)).toBe(-240);
    expect(standardOffsetMinutes(NEW_YORK, SUMMER)).toBe(-300);
    // southern hemisphere: daylight saving in January
    expect(offsetMinutesAt(SYDNEY, WINTER)).toBe(660);
    expect(standardOffsetMinutes(SYDNEY, WINTER)).toBe(600);
    expect(offsetMinutesAt(KATHMANDU, WINTER)).toBe(345);
    expect(offsetMinutesAt('UTC', WINTER)).toBe(0);
  });

  it('writes offsets as UTC with a true minus and minutes only when there are some', () => {
    expect(formatOffset(0)).toBe('UTC');
    expect(formatOffset(-300)).toBe('UTC−5');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(-570)).toBe('UTC−9:30');
  });
});

describe('time zone options', () => {
  it('names each zone by city, zone name and country, not by its IANA id', () => {
    const newYork = find(WINTER, NEW_YORK);
    expect(newYork).toMatchObject({
      city: 'New York',
      name: 'Eastern Time',
      country: 'United States',
      countryCode: 'US',
      abbreviation: 'EST',
      offsetLabel: 'UTC−5'
    });
    expect(newYork.location).toHaveLength(2);
    expect(timeZoneDisplay(newYork)).toBe('New York · Eastern Time (UTC−5)');
    expect(timeZoneDisplay(find(WINTER, 'UTC'))).toBe('UTC');
  });

  it("shows today's city for an alias a runtime still reports, and keeps the alias as the value", () => {
    const calcutta = find(WINTER, CALCUTTA);
    expect(calcutta.timeZone).toBe(CALCUTTA);
    expect(calcutta.city).toBe('Kolkata');
    expect(calcutta.country).toBe('India');
    expect(calcutta.location).toEqual(find(WINTER, KOLKATA).location);
  });

  it('orders zones west to east', () => {
    expect(ids(options())).toEqual([CHICAGO, BOGOTA, NEW_YORK, 'UTC', PARIS, CALCUTTA, KOLKATA, KATHMANDU, SYDNEY]);
  });

  it('drops what the runtime cannot resolve', () => {
    expect(ids(buildTimeZoneOptions({ timeZones: ['Mars/Olympus_Mons', 'UTC'], date: WINTER }))).toEqual(['UTC']);
  });
});

describe('searching time zones', () => {
  it('finds a zone by city, zone name, country or abbreviation, accents and case aside', () => {
    expect(ids(searchTimeZones(options(), 'new york'))).toEqual([NEW_YORK]);
    // Sydney's zone is "Eastern Australia Time": a name, matched as one
    expect(ids(searchTimeZones(options(), 'eastern'))).toEqual([NEW_YORK, SYDNEY]);
    expect(ids(searchTimeZones(options(), 'est'))).toContain(NEW_YORK);
    expect(ids(searchTimeZones(options(), 'india'))).toEqual([CALCUTTA, KOLKATA]);
    expect(ids(searchTimeZones(options(), 'Népal'))).toEqual([KATHMANDU]);
    expect(ids(searchTimeZones(options(), 'united states'))).toEqual([CHICAGO, NEW_YORK]);
  });

  it('puts a city that starts with the query first', () => {
    const list = buildTimeZoneOptions({ timeZones: ['America/Paramaribo', PARIS], date: WINTER, zones });
    expect(ids(searchTimeZones(list, 'par'))).toEqual(['America/Paramaribo', PARIS]);
    expect(ids(searchTimeZones(list, 'pari'))).toEqual([PARIS]);
  });

  it('finds zones by offset, now or in standard time, however it is written', () => {
    expect(ids(searchTimeZones(options(), '-5'))).toEqual([BOGOTA, NEW_YORK]);
    expect(ids(searchTimeZones(options(), 'UTC−5'))).toEqual([BOGOTA, NEW_YORK]);
    expect(ids(searchTimeZones(options(), 'gmt+5:30'))).toEqual([CALCUTTA, KOLKATA]);
    expect(ids(searchTimeZones(options(), '+545'))).toEqual([KATHMANDU]);
    // in July New York is at -4, but -5 is still its standard offset; Chicago's daylight time is -5
    expect(ids(searchTimeZones(options(SUMMER), '-5'))).toEqual([BOGOTA, CHICAGO, NEW_YORK]);
    expect(ids(searchTimeZones(options(SUMMER), '-4'))).toEqual([NEW_YORK]);
  });

  it('needs every word to match', () => {
    expect(ids(searchTimeZones(options(), 'eastern -5'))).toEqual([NEW_YORK]);
    expect(searchTimeZones(options(), 'eastern +1')).toEqual([]);
  });
});

describe('the map', () => {
  it('places every zone the tz database locates, inside the map', () => {
    for (const [x, y] of Object.values(ZONE_LOCATIONS)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it('has a band for each offset the picked zones sit in', () => {
    const bands = new Set(OFFSET_BANDS.map((band) => band.offset * 60));
    for (const option of options()) expect(bands.has(option.standardOffsetMinutes)).toBe(true);
  });

  it("prefers the zone in the band under the pointer over a nearer one across the band's edge", () => {
    const list = options();
    const chicago = find(WINTER, CHICAGO).location!;
    // just east of Chicago, in the Eastern band: New York's zone, though Chicago's dot is nearer
    const point = [chicago[0] + 1, chicago[1]] as const;
    expect(nearestTimeZone(list, point)?.timeZone).toBe(CHICAGO);
    expect(nearestTimeZone(list, point, { bandOffsetMinutes: -300 })?.timeZone).toBe(NEW_YORK);
  });

  it('finds nothing in open ocean, far from any zone', () => {
    expect(nearestTimeZone(options(), [150, 100])).toBeUndefined();
  });
});
