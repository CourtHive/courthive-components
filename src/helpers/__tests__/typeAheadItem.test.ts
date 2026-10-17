/**
 * @vitest-environment happy-dom
 */
import { typeAheadItem } from '../createTypeAhead';
import { describe, expect, it } from 'vitest';

const PAYLOAD = '<img src=x onerror="globalThis.__xss=1">';

describe('typeAheadItem', () => {
  it('renders a suggestion holding markup as text', () => {
    const li = typeAheadItem.call({ count: 1 }, `${PAYLOAD} Smith`, 'smi', 0);
    expect(li.querySelector('img')).toBeNull();
    expect(li.textContent).toBe(`${PAYLOAD} Smith`);
  });

  it('still marks every match, case-insensitively, keeping the original case', () => {
    const li = typeAheadItem.call({ count: 2 }, 'Anna Annabel', 'ann', 3);
    expect([...li.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Ann', 'Ann']);
    expect(li.textContent).toBe('Anna Annabel');
    expect(li.id).toBe('awesomplete_list_2_item_3');
    expect(li.getAttribute('role')).toBe('option');
  });

  it('marks nothing for an empty input', () => {
    const li = typeAheadItem.call({ count: 0 }, 'Anna', '  ', 0);
    expect(li.querySelector('mark')).toBeNull();
    expect(li.textContent).toBe('Anna');
  });
});
