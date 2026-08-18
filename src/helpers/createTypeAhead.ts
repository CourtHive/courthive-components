/**
 * Create Awesomplete type-ahead input with auto-complete functionality.
 * Handles keyboard navigation, tab catching, and automatic selection.
 */
import { isFunction } from './typeOf';

import AWSP from 'awesomplete';

type CreateTypeAheadParams = {
  list: any[];
  element: HTMLInputElement;
  callback?: (value: string) => void;
  /**
   * A stored CODE to resolve to its display LABEL — e.g. `'FRA'` rendering as
   * `'🇫🇷 France'`. Requires a `{ value, label }` list; see `resolveCurrentLabel`.
   * This is NOT "the input's initial value": to set that directly, give the field
   * a `value`, which `renderField` applies after this runs.
   */
  currentCode?: string;
  /**
   * @deprecated Misleading name — it never meant "the current value". Use `currentCode`.
   * Still honoured so published consumers keep working.
   */
  currentValue?: string;
  /**
   * Set false to silence the unresolved-code warning, for a caller that
   * legitimately supplies a code absent from the list.
   */
  warnUnresolved?: boolean;
  withCatchTab?: boolean;
  onChange?: (event: Event) => void;
  onSelectComplete?: () => void;
  listProvider?: () => any[]; // Function to get fresh list
};

/**
 * Resolve a stored code to the label that should be shown for it.
 *
 * Only a `{ value, label }` list can be resolved: the whole point is that what is
 * stored (`'FRA'`) differs from what is read (`'🇫🇷 France'`). A list of plain
 * strings has no such mapping — code and label are the same string — so it
 * returns `undefined` and the caller should set the field's `value` instead.
 *
 * Exported for unit testing; the wiring below is the only production caller.
 */
export function resolveCurrentLabel(list: any[], code?: string): string | undefined {
  if (!code || !Array.isArray(list)) return undefined;
  return list.find((item: any) => item?.value === code)?.label;
}

export function createTypeAhead({
  list,
  element,
  callback,
  currentCode,
  currentValue,
  warnUnresolved,
  withCatchTab,
  onChange,
  onSelectComplete,
  listProvider
}: CreateTypeAheadParams): { typeAhead: any } {
  const typeAhead = new AWSP(element, { list });
  if (element.parentElement) element.parentElement.style.width = '100%';

  // Refresh list on focus if listProvider is available
  if (isFunction(listProvider)) {
    element.addEventListener('focus', () => {
      const freshList = listProvider();
      typeAhead.list = freshList;
    });
  }

  let selectionFlag = false;
  let valueOnFocus = ''; // Track value when field receives focus

  const selectComplete = (c: any) => {
    selectionFlag = true;
    if (isFunction(callback)) callback(c.text.value);
    element.value = c.text.label;
    typeAhead.suggestions = [];
    // Trigger onSelectComplete callback after selection
    if (isFunction(onSelectComplete)) {
      setTimeout(() => onSelectComplete(), 0);
    }
  };

  if (withCatchTab) {
    const catchTab = (evt: KeyboardEvent) => evt.key === 'Tab' && evt.preventDefault();
    element.addEventListener('keydown', catchTab, false);
    element.addEventListener('keyup', catchTab, false);
  }
  if (typeof onChange === 'function') element.addEventListener('change', onChange);
  element.setAttribute('autocomplete', 'off');

  // Capture the value when the field receives focus to detect unchanged Tab-through
  element.addEventListener('focus', () => {
    valueOnFocus = element.value;
  });

  element.addEventListener('awesomplete-selectcomplete', (c: any) => selectComplete(c), false);
  element.addEventListener('keyup', function (evt: any) {
    // Don't auto-select on Shift+Tab (backward navigation)
    const isShiftTab = evt.key === 'Tab' && evt.shiftKey;

    if ((evt.key === 'Enter' || (evt.key === 'Tab' && !isShiftTab)) && !selectionFlag) {
      const fieldValue = element.value.trim();
      const isFieldEmpty = fieldValue === '';

      // If Tab landed on a field whose value hasn't changed, don't auto-select.
      // The user is just tabbing through — let normal tab order proceed.
      if (evt.key === 'Tab' && fieldValue === valueOnFocus && !isFieldEmpty) {
        return;
      }

      // CRITICAL: Check if field is empty FIRST, before checking suggestions
      // Empty field + Enter = user wants to clear/remove assignment
      if (evt.key === 'Enter' && isFieldEmpty) {
        if (isFunction(callback)) {
          callback(''); // Pass empty string to trigger remove
        }
        // Clear suggestions and input
        element.value = '';
        typeAhead.suggestions = [];
        // Trigger onSelectComplete for focus management
        if (isFunction(onSelectComplete)) {
          setTimeout(() => onSelectComplete(), 0);
        }
        return; // Don't proceed to auto-select
      }

      // If there are suggestions AND field is not empty, auto-select the first one
      if (typeAhead.suggestions?.length && !isFieldEmpty) {
        typeAhead.next();
        typeAhead.select(0);
      }
    }
    selectionFlag = false;
  });

  // `currentCode` is the honest name; `currentValue` is the deprecated alias.
  const code = currentCode ?? currentValue;
  if (code) {
    const currentLabel = resolveCurrentLabel(list, code);
    if (currentLabel) {
      element.value = currentLabel;
    } else if (warnUnresolved !== false) {
      // Previously this branch did nothing at all, so a mismatched list shape
      // rendered an empty input with no signal anywhere — the TMX time-zone
      // field shipped that way against a list of plain strings. Deliberately a
      // warning rather than a fallback: what renders is unchanged, and the
      // caller is told which fix applies.
      const shape =
        Array.isArray(list) && list.some((item: any) => typeof item === 'string')
          ? 'the list holds plain strings, which cannot map a code to a different label — set the field `value` instead'
          : 'no list entry has that `value`';
      console.warn(`[createTypeAhead] "${code}" did not resolve to a label, so the input is left empty — ${shape}.`);
    }
  }

  return { typeAhead };
}
