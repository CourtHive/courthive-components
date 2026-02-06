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
  listProvider,
}: CreateTypeAheadParams): { typeAhead: any } {
  const typeAhead = new AWSP(element, { list });
  if (element.parentElement) element.parentElement.style.width = '100%';

  // Refresh list on focus if listProvider is available
  if (isFunction(listProvider)) {
    element.addEventListener('focus', () => {
      const freshList = listProvider();
      console.log('[TypeAhead] Refreshing list on focus:', {
        inputId: element.id,
        listLength: freshList.length,
        items: freshList.slice(0, 3),
      });
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
    if ((evt.key === 'Enter' || evt.key === 'Tab') && !selectionFlag && typeAhead.suggestions?.length) {
      typeAhead.next();
      typeAhead.select(0);
    }
    selectionFlag = false;
  });

  if (currentValue) {
    const currentLabel = list.find((item: any) => item.value === currentValue)?.label;
    if (currentLabel) element.value = currentLabel;
  }

  return { typeAhead };
}
