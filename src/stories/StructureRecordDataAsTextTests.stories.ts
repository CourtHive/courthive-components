/**
 * Structure — record data renders as text, never as markup.
 *
 * Moved from an emulated-DOM unit test. Record data comes from servers, integrators and imported files; a name
 * that holds markup must render as that literal text, never as elements (TMX and courthive-public both draw
 * with these renderers). In a real browser an injected `<img src=x onerror=…>` does fire its handler, so the
 * play asserts the handler's side effect never happened, after proving with a CONTROL that the same payload,
 * written as markup, does fire it here.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderPersonAttribute } from '../components/renderStructure/renderPersonAttribute';
import { renderSchedule } from '../components/renderStructure/renderSchedule';
import { renderAddress } from '../components/renderStructure/renderAddress';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { renderScale } from '../components/renderStructure/renderScale';
import { renderTeam } from '../components/renderStructure/renderTeam';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor } from 'storybook/test';
import type { MatchUp } from '../types';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Record Data As Text',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const PAYLOAD = '<img src=x onerror="globalThis.__xss=1">';
const CONTROL_PAYLOAD = '<img src=x onerror="globalThis.__xssControl=1">';

const person = {
  standardGivenName: PAYLOAD,
  standardFamilyName: PAYLOAD,
  addresses: [{ city: PAYLOAD, state: 'S', countryCode: 'USA' }]
};

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

const individualParticipant = {
  participantId: 'p1',
  participantName: PAYLOAD,
  person,
  rankings: { SINGLES: [{ scaleName: 'R', scaleValue: PAYLOAD }] },
  teams: [{ participantId: 't1', participantName: PAYLOAD }]
} as any;

const RENDERERS: [string, () => HTMLElement | string][] = [
  ['matchUp', () => renderMatchUp({ matchUp } as any)],
  ['team', () => renderTeam({ individualParticipant })],
  ['address', () => renderAddress({ individualParticipant })],
  ['person attribute', () => renderPersonAttribute({ individualParticipant, attribute: 'standardFamilyName' })],
  ['schedule location', () => renderSchedule({ matchUp: { schedule: { courtName: PAYLOAD } } as any })],
  [
    'scale value',
    () =>
      renderScale({
        individualParticipant,
        matchUp: { matchUpType: 'SINGLES' } as any,
        composition: { configuration: { scaleAttributes: { scaleType: 'RANKING', scaleName: 'R' } } }
      } as any)
  ]
];

export const RecordDataRendersAsText: StoryObj = {
  render: () => {
    delete (globalThis as any).__xss;
    delete (globalThis as any).__xssControl;
    const outer = document.createElement('div');
    outer.style.cssText = 'display:flex; flex-direction:column; gap:12px; padding:12px; width:360px;';
    for (const [name, render] of RENDERERS) {
      const block = document.createElement('div');
      block.dataset.testid = name;
      block.append(render());
      outer.appendChild(block);
    }
    return outer;
  },
  play: async ({ canvasElement }) => {
    // CONTROL — the same payload written as markup does run its handler in this browser
    const control = document.createElement('div');
    control.innerHTML = CONTROL_PAYLOAD;
    canvasElement.appendChild(control);
    await waitFor(() => expect((globalThis as any).__xssControl).toBe(1));
    control.remove();

    for (const [name] of RENDERERS) {
      const block = canvasElement.querySelector<HTMLElement>(`[data-testid="${name}"]`)!;
      await expect(block.querySelector('img'), name).toBeNull();
      await expect(block.textContent, name).toContain(PAYLOAD);
    }
    // the renderers' payloads had the whole render and the control's load to fire, and did not
    await expect((globalThis as any).__xss).toBeUndefined();
  }
};
