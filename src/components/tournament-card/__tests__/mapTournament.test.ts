import { mapTournamentToCardData } from '../mapTournament';
import { describe, it, expect } from 'vitest';

const NOW = new Date('2026-05-17T12:00:00Z');
const MAY_17 = '2026-05-17';

describe('mapTournamentToCardData', () => {
  it('returns empty defaults for null input', () => {
    const out = mapTournamentToCardData(null);
    expect(out.tournamentId).toBe('');
    expect(out.tournamentName).toBe('');
    expect(out.participantCount).toBeUndefined();
  });

  it('maps core identity + dates', () => {
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        tournamentName: 'Spring Slam',
        startDate: '2026-05-22',
        endDate: '2026-05-24'
      },
      { now: NOW }
    );
    expect(out.tournamentId).toBe('t1');
    expect(out.tournamentName).toBe('Spring Slam');
    expect(out.startDate).toBe('2026-05-22');
    expect(out.endDate).toBe('2026-05-24');
    expect(out.dateRangeFormatted).toBeTruthy();
    expect(out.dateRangeFormatted).toContain('2026');
  });

  it('extracts URL image from onlineResources', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      onlineResources: [
        { name: 'tournamentImage', resourceType: 'URL', url: 'https://example.com/img.png' }
      ]
    });
    expect(out.tournamentImageURL).toBe('https://example.com/img.png');
  });

  it('extracts court SVG sport identifier', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      onlineResources: [
        { name: 'tournamentImage', resourceSubType: 'COURT_SVG', identifier: 'tennis' }
      ]
    });
    expect(out.courtSvgSport).toBe('tennis');
  });

  it('formats venue location with city, region, country', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      venues: [
        {
          venueName: 'Big Court',
          addresses: [{ city: 'Buford', state: 'GA', countryCode: 'USA' }]
        }
      ]
    });
    expect(out.location).toBe('Buford, GA, USA');
  });

  it('falls back to venueName when no address present', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      venues: [{ venueName: 'Big Court' }]
    });
    expect(out.location).toBe('Big Court');
  });

  it('computes participantCount', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      participants: [{ participantId: 'p1' }, { participantId: 'p2' }, { participantId: 'p3' }]
    });
    expect(out.participantCount).toBe(3);
  });

  it('resolves status pill via statusResolver', () => {
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        startDate: '2026-05-15',
        endDate: '2026-05-20'
      },
      { now: NOW }
    );
    expect(out.status?.kind).toBe('live');
  });

  it('formats fee range from registrationProfile.entryFees', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      registrationProfile: {
        entryFees: [
          { amount: 40, currencyCode: 'USD' },
          { amount: 85, currencyCode: 'USD' }
        ]
      }
    });
    expect(out.feeFormatted).toContain('40');
    expect(out.feeFormatted).toContain('85');
  });

  it('respects statusOverride', () => {
    const out = mapTournamentToCardData(
      { tournamentId: 't1', startDate: '2026-05-15', endDate: '2026-05-20' },
      { now: NOW, statusOverride: null }
    );
    expect(out.status).toBeNull();
  });

  // The TODS canonical field is `localTimeZone`. Some inbound payloads use
  // `timeZone` as a shorthand — accept either so the chip reflects the
  // tournament's actual local-day boundary regardless of which dialect the
  // caller hands us. Without this, a tournament with `timeZone` only would
  // silently fall through to host-local resolution.
  it('forwards localTimeZone to the status resolver (canonical field)', () => {
    // NY is UTC-4 in May. endDate "2026-05-17" in NY runs through 03:59 UTC
    // on the 18th. At 04:00 UTC on the 17th (= midnight NY) the tournament
    // is Live; at 03:59 UTC on the 18th it's still Live.
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        startDate: MAY_17,
        endDate: MAY_17,
        localTimeZone: 'America/New_York'
      },
      { now: new Date('2026-05-18T03:59:59Z') }
    );
    expect(out.status?.kind).toBe('live');
  });

  it('forwards the legacy `timeZone` shorthand when localTimeZone is absent', () => {
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        startDate: MAY_17,
        endDate: MAY_17,
        timeZone: 'America/New_York'
      },
      { now: new Date('2026-05-18T03:59:59Z') }
    );
    expect(out.status?.kind).toBe('live');
  });

  describe('tournamentTier', () => {
    it('passes through a well-formed tier with numericRank', () => {
      const out = mapTournamentToCardData({
        tournamentId: 't1',
        tournamentTier: { system: 'ITF_JUNIOR', value: 'J500', numericRank: 4 }
      });
      expect(out.tournamentTier).toEqual({ system: 'ITF_JUNIOR', value: 'J500', numericRank: 4 });
    });

    it('omits numericRank when not present on the source', () => {
      const out = mapTournamentToCardData({
        tournamentId: 't1',
        tournamentTier: { system: 'PPA', value: 'Gold' }
      });
      expect(out.tournamentTier).toEqual({ system: 'PPA', value: 'Gold' });
      expect(out.tournamentTier?.numericRank).toBeUndefined();
    });

    it('drops malformed tiers (non-object, missing system, missing value, non-string types)', () => {
      // A bad tier shouldn't render a broken chip — better to render no chip
      // than a chip with "undefined" text. Mirrors the defensive shape checks
      // around the rest of the mapper.
      const cases = [
        { tournamentId: 't1', tournamentTier: 'J500' },
        { tournamentId: 't1', tournamentTier: { system: 'ITF_JUNIOR' } },
        { tournamentId: 't1', tournamentTier: { value: 'J500' } },
        { tournamentId: 't1', tournamentTier: { system: 123, value: 'J500' } },
        { tournamentId: 't1', tournamentTier: null },
        { tournamentId: 't1' }
      ];
      for (const input of cases) {
        const out = mapTournamentToCardData(input as any);
        expect(out.tournamentTier).toBeUndefined();
      }
    });

    it('drops a non-finite numericRank but keeps the rest of the tier', () => {
      const out = mapTournamentToCardData({
        tournamentId: 't1',
        tournamentTier: { system: 'ATP', value: '1000', numericRank: Number.NaN }
      });
      expect(out.tournamentTier).toEqual({ system: 'ATP', value: '1000' });
    });
  });
});
