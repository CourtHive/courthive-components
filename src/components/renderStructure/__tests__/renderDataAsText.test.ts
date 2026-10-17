/**
 * @vitest-environment happy-dom
 */
import { renderPersonAttribute } from '../renderPersonAttribute';
import { renderAddress } from '../renderAddress';
import { renderSchedule } from '../renderSchedule';
import { renderMatchUp } from '../renderMatchUp';
import { describe, expect, it } from 'vitest';
import { renderScale } from '../renderScale';
import { renderTeam } from '../renderTeam';

import type { MatchUp } from '../../../types';

// Record data comes from servers, integrators and imported files. A name that holds markup must
// render as that literal text, never as elements (TMX and courthive-public both draw with these).
const PAYLOAD = '<img src=x onerror="globalThis.__xss=1">';

const hostile = (element: HTMLElement | string) => {
  const host = document.createElement('div');
  host.append(element);
  return host;
};

const person = {
  standardGivenName: PAYLOAD,
  standardFamilyName: PAYLOAD,
  addresses: [{ city: PAYLOAD, state: 'S', countryCode: 'USA' }]
};

describe('renderStructure writes record data as text', () => {
  it('participant names in a rendered matchUp', () => {
    const matchUp = {
      matchUpId: 'm1',
      matchUpType: 'SINGLES',
      structureId: 's1',
      roundNumber: 1,
      roundPosition: 1,
      finishingRound: 1,
      schedule: { courtName: PAYLOAD, venueAbbreviation: 'V' },
      sides: [
        { sideNumber: 1, participant: { participantId: 'p1', participantName: PAYLOAD, person } },
        { sideNumber: 2, participant: { participantId: 'p2', participantName: PAYLOAD, person } }
      ],
      score: { scoreStringSide1: '', scoreStringSide2: '' }
    } as unknown as MatchUp;
    const host = hostile(renderMatchUp({ matchUp } as any));
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain(PAYLOAD);
  });

  it('team, address, person attribute, schedule location and scale value', () => {
    const individualParticipant = {
      participantId: 'p1',
      participantName: PAYLOAD,
      person,
      rankings: { SINGLES: [{ scaleName: 'R', scaleValue: PAYLOAD }] },
      teams: [{ participantId: 't1', participantName: PAYLOAD }]
    } as any;
    const rendered = [
      renderTeam({ individualParticipant }),
      renderAddress({ individualParticipant }),
      renderPersonAttribute({ individualParticipant, attribute: 'standardFamilyName' }),
      renderSchedule({ matchUp: { schedule: { courtName: PAYLOAD } } as any }),
      renderScale({
        individualParticipant,
        matchUp: { matchUpType: 'SINGLES' } as any,
        composition: { configuration: { scaleAttributes: { scaleType: 'RANKING', scaleName: 'R' } } }
      } as any)
    ];
    for (const [index, element] of rendered.entries()) {
      const host = hostile(element);
      expect(host.querySelector('img'), `renderer ${index}`).toBeNull();
      expect(host.textContent, `renderer ${index}`).toContain(PAYLOAD);
    }
  });
});
