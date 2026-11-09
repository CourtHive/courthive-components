import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { compositions } from '../compositions/compositions';
import { applyThemePalette } from '../theme/palettes';
import { expect } from 'storybook/test';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition, MatchUp } from '../types';

type Args = { mode: 'light' | 'dark'; enabled: boolean; width: number; variant?: 'longNames' | 'slots' };

const meta: Meta<Args> = {
  title: 'Policies & Setup/Composition/Consistency Audit',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'All registered presets with deterministic match data. Defaults preserve each preset; enabled views turn on the shared schedule header, round header and footer. Cards and bracket columns scroll as complete graphics at narrow widths. Serving indicators identify a side, require serving data and disappear on finished matches. See docs/COMPOSITION_OPTIONS.md for the visibility and styling contract.'
      }
    }
  }
};
export default meta;
type Story = StoryObj<Args>;

function fixture(): MatchUp[] {
  mocksEngine.generateTournamentRecord({
    nonRandom: 1,
    setState: true,
    drawProfiles: [{ drawSize: 4 }]
  });
  const { matchUps } = tournamentEngine.allTournamentMatchUps();
  return matchUps as unknown as MatchUp[];
}

function example(matchUp: MatchUp, state: 'live' | 'done' | 'missing'): MatchUp {
  return {
    ...matchUp,
    matchUpId: `${matchUp.matchUpId}-${state}`,
    matchUpStatus: state === 'done' ? 'COMPLETED' : 'IN_PROGRESS',
    winningSide: state === 'done' ? 1 : undefined,
    serverSideNumber: state === 'missing' ? undefined : 2,
    eventName: state === 'missing' ? undefined : 'Open Singles',
    schedule:
      state === 'missing'
        ? undefined
        : { scheduledDate: '2026-11-09', scheduledTime: '14:00', courtName: 'Court 2', milliseconds: 960_000 },
    score: {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        {
          setNumber: 2,
          side1Score: state === 'done' ? 6 : 3,
          side2Score: 2,
          side1PointScore: state === 'done' ? undefined : '15',
          side2PointScore: state === 'done' ? undefined : '30',
          winningSide: state === 'done' ? 1 : undefined
        }
      ]
    }
  };
}

function graphic(content: HTMLElement, composition: Composition): HTMLElement {
  const wrapper = renderContainer({ theme: composition.theme, content });
  wrapper.style.cssText = 'height:auto; width:max-content; min-width:100%; box-sizing:border-box; padding:8px;';
  return wrapper;
}

function customFooter(): HTMLElement {
  const text = document.createElement('span');
  text.textContent = 'Host event metadata';
  return text;
}

function renderMatrix(args: Args): HTMLElement {
  document.documentElement.dataset.theme = args.mode;
  applyThemePalette(args.mode);
  const root = document.createElement('div');
  root.dataset.auditMode = args.mode;
  root.dataset.auditEnabled = String(args.enabled);
  root.style.cssText = `width:${args.width}px; max-width:100%; padding:12px; box-sizing:border-box; color:var(--chc-text-primary); background:var(--chc-bg-primary);`;
  const matchUps = fixture();
  if (args.variant === 'longNames') {
    for (const matchUp of matchUps) {
      for (const side of matchUp.sides || []) {
        if (!side.participant) continue;
        side.participant.participantName = 'Alexandria Montgomery-Wellington';
        for (const individual of side.participant.individualParticipants || []) {
          individual.participantName = 'Alexandria Montgomery-Wellington';
          individual.person = {
            ...individual.person,
            standardGivenName: 'Alexandria',
            standardFamilyName: 'Montgomery-Wellington'
          };
        }
      }
    }
  }
  for (const [name, preset] of Object.entries(compositions)) {
    const composition: Composition = {
      ...preset,
      configuration: {
        ...preset.configuration,
        ...(args.enabled ? { scheduleInfo: true, matchUpFooter: true, roundHeader: true } : {}),
        ...(args.variant === 'slots' ? { matchUpFooter: false, renderers: { matchUpFooter: customFooter } } : {})
      }
    };
    const section = document.createElement('section');
    section.dataset.auditPreset = name;
    const title = document.createElement('h2');
    title.textContent = name;
    section.appendChild(title);
    for (const state of ['live', 'done', 'missing'] as const) {
      const scroll = document.createElement('div');
      scroll.dataset.auditState = state;
      scroll.style.cssText = 'overflow:auto; max-width:100%; margin-bottom:12px;';
      const matchUp = example(matchUps[0], state);
      scroll.appendChild(graphic(renderMatchUp({ composition, matchUp }), composition));
      section.appendChild(scroll);
    }
    const bracket = document.createElement('div');
    bracket.dataset.auditStructure = 'true';
    bracket.style.cssText = 'overflow:auto; max-width:100%; margin-bottom:24px;';
    bracket.appendChild(graphic(renderStructure({ matchUps, composition }), composition));
    section.appendChild(bracket);
    root.appendChild(section);
  }
  return root;
}

function rgb(value: string): number[] {
  return value.match(/[\d.]+/g)!.map(Number);
}

function paintedBackground(element: Element): number[] {
  let color = [0, 0, 0, 0];
  for (let parent: Element | null = element; parent && color[3] < 0.999; parent = parent.parentElement) {
    const next = rgb(getComputedStyle(parent).backgroundColor);
    const alpha = next[3] ?? 1;
    const combined = color[3] + alpha * (1 - color[3]);
    color = [0, 1, 2]
      .map((index) => (color[index] * color[3] + next[index] * alpha * (1 - color[3])) / (combined || 1))
      .concat(combined);
  }
  return color;
}

function luminance(color: number[]): number {
  return color
    .slice(0, 3)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(element: Element): number {
  const foreground = luminance(rgb(getComputedStyle(element).color));
  const background = luminance(paintedBackground(element));
  return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
}

async function checkMatrix({ canvasElement, args }: { canvasElement: HTMLElement; args: Args }): Promise<void> {
  const sections = canvasElement.querySelectorAll<HTMLElement>('[data-audit-preset]');
  expect(sections).toHaveLength(Object.keys(compositions).length);
  for (const section of sections) {
    const preset = compositions[section.dataset.auditPreset!];
    const configuration = preset.configuration || {};
    const live = section.querySelector('[data-audit-state="live"]')!;
    expect(live.querySelectorAll('.chc-server--active')).toHaveLength(configuration.serverIndicator ? 1 : 0);
    expect(section.querySelector('[data-audit-state="done"] .chc-server')).toBeNull();
    expect(section.querySelector('[data-audit-state="missing"] .chc-server')).toBeNull();
    expect(!!live.querySelector('.chc-scheduling')).toBe(args.enabled || !!configuration.scheduleInfo);
    expect(!!live.querySelector('.chc-matchup-footer')).toBe(
      args.enabled || !!configuration.matchUpFooter || args.variant === 'slots'
    );
    if (args.variant === 'slots')
      expect(live.querySelector('.chc-matchup-footer')?.textContent).toContain('Host event metadata');
    expect(!!section.querySelector('.chc-round-header')).toBe(args.enabled || !!configuration.roundHeader);
    for (const region of section.querySelectorAll('.chc-scheduling, .chc-matchup-footer, .chc-round-header')) {
      expect(contrast(region), `${section.dataset.auditPreset}: ${region.className}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const card of section.querySelectorAll<HTMLElement>('.chc-matchup')) {
      expect(card.getBoundingClientRect().width).toBeGreaterThan(0);
      for (const row of card.querySelectorAll<HTMLElement>('.chc-side-row')) {
        expect(row.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
      }
    }
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(globalThis.innerWidth + 1);
}

export const LightDefaults: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: false, width: 1000 },
  play: checkMatrix
};
export const DarkDefaults: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: false, width: 1000 },
  play: checkMatrix
};
export const LightEnabled: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: true, width: 1000 },
  play: checkMatrix
};
export const DarkEnabled: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: true, width: 1000 },
  play: checkMatrix
};
export const NarrowLightDefaults: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: false, width: 360 },
  play: checkMatrix
};
export const NarrowDarkDefaults: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: false, width: 360 },
  play: checkMatrix
};
export const NarrowLightEnabled: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: true, width: 360 },
  play: checkMatrix
};
export const NarrowDarkEnabled: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: true, width: 360 },
  play: checkMatrix
};

export const NarrowLongNamesLight: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: true, width: 360, variant: 'longNames' },
  play: checkMatrix
};
export const NarrowLongNamesDark: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: true, width: 360, variant: 'longNames' },
  play: checkMatrix
};
export const CustomFootersLight: Story = {
  render: renderMatrix,
  args: { mode: 'light', enabled: false, width: 360, variant: 'slots' },
  play: checkMatrix
};
export const CustomFootersDark: Story = {
  render: renderMatrix,
  args: { mode: 'dark', enabled: false, width: 360, variant: 'slots' },
  play: checkMatrix
};
