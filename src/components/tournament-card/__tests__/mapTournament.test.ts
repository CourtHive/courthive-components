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

  describe('participantCount counts competitors, not people', () => {
    const record = (participants: any[], extra: any = {}) =>
      mapTournamentToCardData({ tournamentId: 't1', participants, ...extra });

    const player = (participantId: string) => ({
      participantId,
      participantType: 'INDIVIDUAL',
      participantRole: 'COMPETITOR'
    });

    it('excludes staff and officials', () => {
      // 2 players + 2 personnel read as "4 players" on the card, and TMX's tournaments-list sort key
      // inherits the number.
      const out = record([
        player('p1'),
        player('p2'),
        { participantId: 's1', participantType: 'INDIVIDUAL', participantRole: 'OFFICIAL' },
        { participantId: 's2', participantType: 'INDIVIDUAL', participantRole: 'PHYSIO' }
      ]);
      expect(out.participantCount).toBe(2);
    });

    it('excludes PAIR and TEAM so a doubles field is not double-counted', () => {
      // The pair AND both its members are participants. Counting all three reports six players in a
      // two-pair draw.
      const out = record([
        player('p1'),
        player('p2'),
        { participantId: 'd1', participantType: 'PAIR', participantRole: 'COMPETITOR' },
        { participantId: 't1', participantType: 'TEAM', participantRole: 'COMPETITOR' }
      ]);
      expect(out.participantCount).toBe(2);
    });

    it('excludes GROUPs', () => {
      const out = record([
        player('p1'),
        { participantId: 'g1', participantType: 'GROUP', participantRole: 'COACH', participantName: 'Van A' }
      ]);
      expect(out.participantCount).toBe(1);
    });

    it('counts participants carrying neither type nor role', () => {
      // Absent does not exclude. A record written before these fields were universally present holds
      // players, and dropping them would under-report every older tournament.
      expect(record([{ participantId: 'p1' }, { participantId: 'p2' }]).participantCount).toBe(2);
    });

    it('PREFERS a pre-baked individualParticipantCount over the raw array', () => {
      // getTournamentInfo has counted competitors-only since factory #4684. Consuming that beats
      // recomputing a role filter in every consumer.
      const out = record([player('p1'), player('p2')], { individualParticipantCount: 32 });
      expect(out.participantCount).toBe(32);
    });

    it('falls back to the array when no count is pre-baked', () => {
      expect(record([player('p1')], { individualParticipantCount: undefined }).participantCount).toBe(1);
    });

    it('reports undefined rather than 0 when nobody qualifies', () => {
      // The card hides the chip on undefined; "0 players" is noise on a tournament with no entries yet.
      expect(record([{ participantId: 's1', participantRole: 'OFFICIAL' }]).participantCount).toBeUndefined();
      expect(record([], { individualParticipantCount: 0 }).participantCount).toBeUndefined();
    });
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

  // `unit` is required to place an amount on a scale — see feeFormatter. The fixture states it;
  // the original assertions are unchanged.
  it('formats fee range from registrationProfile.entryFees', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      registrationProfile: {
        entryFees: [
          { amount: 40, currencyCode: 'USD', unit: 'MAJOR' },
          { amount: 85, currencyCode: 'USD', unit: 'MAJOR' }
        ]
      }
    });
    expect(out.feeFormatted).toContain('40');
    expect(out.feeFormatted).toContain('85');
  });

  // The 100x bug, pinned. A federation surface that states entry fees in minor units used to
  // render $60.00 as "$6,000.00" because Intl.NumberFormat formats MAJOR units.
  it('renders minor units at the right scale', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      registrationProfile: {
        entryFees: [{ amount: 6000, currencyCode: 'USD', unit: 'MINOR' }]
      }
    });
    expect(out.feeFormatted).toContain('60.00');
    expect(out.feeFormatted).not.toContain('6,000');
  });

  // A fee with no unit cannot be placed on a scale, so no badge is better than a badge that may be
  // out by 100x.
  it('renders no badge for a fee whose scale is unstated', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      registrationProfile: { entryFees: [{ amount: 6000, currencyCode: 'USD' }] }
    });
    expect(out.feeFormatted).toBeFalsy();
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
