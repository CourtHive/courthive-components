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
  currentValue?: string;
  withCatchTab?: boolean;
  onChange?: (event: Event) => void;
  onSelectComplete?: () => void;
  listProvider?: () => any[]; // Function to get fresh list
};

export function createTypeAhead({
  list,
  element,
  callback,
  currentValue,
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
  element.addEventListener('awesomplete-selectcomplete', (c: any) => selectComplete(c), false);
  element.addEventListener('keyup', function (evt: any) {
    // Don't auto-select on Shift+Tab (backward navigation)
    const isShiftTab = evt.key === 'Tab' && evt.shiftKey;

    if ((evt.key === 'Enter' || (evt.key === 'Tab' && !isShiftTab)) && !selectionFlag) {
      const fieldValue = element.value.trim();
      const isFieldEmpty = fieldValue === '';

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

  if (currentValue) {
    const currentLabel = list.find((item: any) => item.value === currentValue)?.label;
    if (currentLabel) element.value = currentLabel;
  }

  return { typeAhead };
}
