/**
 * typeAheadItem — the suggestion renderer, in a real DOM (#744).
 *
 * Awesomplete's default renderer builds each suggestion with innerHTML, so a label holding markup would
 * run as script. `typeAheadItem` renders `highlightSegments` (unit-tested in
 * `helpers/__tests__/typeAheadItem.test.ts`) as text nodes and `<mark>` elements. These plays pin the
 * part a node test cannot: that the payload never becomes an element and never executes.
 *
 * Run as tests: `pnpm test:stories src/stories/TypeAheadItemTests.stories.ts`
 */
import { typeAheadItem } from '../helpers/createTypeAhead';
import { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Foundations/Forms/Tests/Type-ahead Item',
  tags: ['!dev']
};
export default meta;

const PAYLOAD = '<img src=x onerror="globalThis.__xss=1">';

function renderList(items: HTMLElement[]): HTMLElement {
  const ul = document.createElement('ul');
  ul.setAttribute('role', 'listbox');
  ul.append(...items);
  return ul;
}

export const MarkupInALabelStaysText: StoryObj = {
  render: () => {
    delete (globalThis as any).__xss;
    return renderList([typeAheadItem.call({ count: 1 }, `${PAYLOAD} Smith`, 'smi', 0)]);
  },
  play: async ({ canvasElement }) => {
    const li = canvasElement.querySelector('li') as HTMLLIElement;
    await expect(li.querySelector('img')).toBeNull();
    await expect(li.textContent).toBe(`${PAYLOAD} Smith`);
    await expect([...li.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Smi']);
    // An <img src=x> fails to load at once; had it been parsed as markup, its onerror would have run.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect((globalThis as any).__xss).toBeUndefined();
  }
};

export const EveryMatchMarkedKeepingCase: StoryObj = {
  render: () => renderList([typeAheadItem.call({ count: 2 }, 'Anna Annabel', 'ann', 3)]),
  play: async ({ canvasElement }) => {
    const li = canvasElement.querySelector('li') as HTMLLIElement;
    await expect([...li.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Ann', 'Ann']);
    await expect(li.textContent).toBe('Anna Annabel');
    await expect(li.id).toBe('awesomplete_list_2_item_3');
    await expect(li.getAttribute('role')).toBe('option');
    await expect(li.getAttribute('aria-selected')).toBe('false');
  }
};

export const EmptyInputMarksNothing: StoryObj = {
  render: () => renderList([typeAheadItem.call({ count: 0 }, 'Anna', '  ', 0)]),
  play: async ({ canvasElement }) => {
    const li = canvasElement.querySelector('li') as HTMLLIElement;
    await expect(li.querySelector('mark')).toBeNull();
    await expect(li.textContent).toBe('Anna');
    await expect(li.id).toBe('awesomplete_list_0_item_0');
  }
};
