/**
 * Composition Colors Stories
 *
 * Exercises per-composition color overrides (`composition.colors`) and the
 * TYPTI preset. Renders a real 8-draw structure through `renderStructure`
 * so the cascade reaches matchUp borders AND connector pseudo-elements.
 */
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Composition, CompositionColors } from '../types';

function buildMatchUps(drawSize = 8) {
  const { eventData } = generateEventData({ drawSize, completeAllMatchUps: true }) || {};
  const structure = eventData?.drawsData?.[0]?.structures?.[0];
  const roundMatchUps = structure?.roundMatchUps;
  return {
    matchUps: roundMatchUps ? Object.values(roundMatchUps).flat() : [],
    context: { structureId: structure?.structureId, drawId: eventData?.drawsData?.[0]?.drawId }
  };
}

function renderDraw(composition: Composition): HTMLElement {
  const { matchUps, context } = buildMatchUps();
  const content = renderStructure({ composition, matchUps: matchUps as any, context });
  return renderContainer({ theme: composition.theme, content });
}

export default {
  title: 'Draws/Composition Colors',
  tags: ['autodocs'],
  argTypes: {
    basePreset: { options: Object.keys(compositions), control: { type: 'select' } },
    border: { control: { type: 'color' } },
    borderHover: { control: { type: 'color' } },
    borderInlineStart: { control: { type: 'color' } },
    borderInlineStartWidth: { control: { type: 'text' } },
    connector: { control: { type: 'text' } },
    matchUpBackground: { control: { type: 'color' } },
    internalDividers: { control: { type: 'color' } }
  }
};

/** Live color override controls on top of a base preset. */
export const CustomColorOverrides = {
  args: {
    basePreset: 'Basic',
    border: '#ff6a00',
    borderHover: '#ff6a00',
    connector: '#ff6a00',
    matchUpBackground: 'var(--chc-bg-elevated)'
  },
  render: (args: any) => {
    const base = compositions[args.basePreset] || compositions.Basic;
    const colors: CompositionColors = {};
    for (const key of [
      'border',
      'borderHover',
      'borderInlineStart',
      'borderInlineStartWidth',
      'connector',
      'matchUpBackground',
      'internalDividers'
    ] as (keyof CompositionColors)[]) {
      const value = args[key];
      if (value) colors[key] = value;
    }
    return renderDraw({ ...base, colors });
  }
};

/** TYPTI preset rendered straight from `compositions.TYPTI`. */
export const TyptiPreset = {
  render: () => renderDraw(compositions.TYPTI)
};

/** Side-by-side: Basic preset vs. Basic + TYPTI-style color overrides vs. TYPTI preset. */
export const SideBySide = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:24px;';

    const variants: Array<{ label: string; composition: Composition }> = [
      { label: 'Basic (baseline)', composition: compositions.Basic },
      {
        label: 'Basic + custom colors',
        composition: {
          ...compositions.Basic,
          colors: {
            border: '#ff6a00',
            borderHover: '#ff6a00',
            connector: '#ff6a00',
            matchUpBackground: 'var(--chc-bg-elevated)'
          }
        }
      },
      { label: 'TYPTI preset', composition: compositions.TYPTI }
    ];

    for (const { label, composition } of variants) {
      const column = document.createElement('div');
      const heading = document.createElement('h4');
      heading.textContent = label;
      heading.style.cssText = 'font-size:13px; margin:0 0 8px; font-family:sans-serif;';
      column.appendChild(heading);
      column.appendChild(renderDraw(composition));
      wrapper.appendChild(column);
    }

    return wrapper;
  }
};
