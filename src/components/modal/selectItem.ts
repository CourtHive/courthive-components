/**
 * Modal-based selection interface with search functionality.
 *
 * Uses dependency injection for table/filter creation to avoid coupling
 * to specific table libraries. When no table factory is provided,
 * falls back to a simple list-based selection.
 */
import { controlBar } from '../controlBar/controlBar';
import { cModal } from './cmodal';

const LEFT = 'left';

export interface SelectItemParams {
  title: string;
  placeholder?: string;
  options: SelectItemOption[];
  selectionLimit?: number;
  /** Factory to create a selection table. If not provided, a simple list is used. */
  createTable?: (config: {
    anchorId: string;
    data: any[];
    selectionLimit?: number;
    onSelected: (value: any[]) => void;
  }) => { table: any; destroy?: () => void };
  /** Factory to create a search filter function for the table. */
  createFilter?: (table: any) => (value: string) => void;
}

export interface SelectItemOption {
  label: string;
  onClick?: () => void;
  [key: string]: any;
}

export function selectItem(params: SelectItemParams) {
  const { title, placeholder, options, selectionLimit, createTable, createFilter } = params;
  const controlId = 'selectionControl';
  const anchorId = 'selectionTable';

  let tableInstance: any;
  let destroyFn: (() => void) | undefined;

  const buttons = [{ label: 'Cancel', intent: 'is-none', close: true }];
  const onClose = () => {
    if (destroyFn) {
      destroyFn();
    } else if (tableInstance?.destroy) {
      tableInstance.destroy();
    }
    tableInstance = undefined;
  };

  const content = `
    <div style='min-height: 420px'>
      <div id='${controlId}'></div>
      <div id='${anchorId}'></div>
    </div>
  `;

  cModal.open({ title, content, buttons, onClose });

  const onSelected = (value: any[]) => {
    if (value?.[0]?.onClick) {
      value[0].onClick();
      cModal.close();
    }
  };

  if (createTable) {
    // Use injected table factory
    const result = createTable({
      anchorId,
      data: options,
      selectionLimit,
      onSelected,
    });
    tableInstance = result.table;
    destroyFn = result.destroy;

    const setSearchFilter = createFilter ? createFilter(tableInstance) : () => {};
    const items = [
      {
        onKeyDown: (e: any) => e.keyCode === 8 && e.target.value.length === 1 && setSearchFilter(''),
        onChange: (e: any) => setSearchFilter(e.target.value),
        onKeyUp: (e: any) => setSearchFilter(e.target.value),
        clearSearch: () => setSearchFilter(''),
        placeholder: placeholder || 'Search',
        location: LEFT,
        search: true,
      },
    ];

    const target = document.getElementById(controlId) || undefined;
    controlBar({ table: tableInstance, target, items });
  } else {
    // Simple list-based fallback (no table library needed)
    const listContainer = document.getElementById(anchorId);
    if (listContainer) {
      renderSimpleList({ container: listContainer, options, onSelected });

      const filterList = (value: string) => {
        const items = listContainer.querySelectorAll('[data-select-item]');
        const lower = value.toLowerCase();
        items.forEach((item) => {
          const text = (item as HTMLElement).textContent?.toLowerCase() || '';
          (item as HTMLElement).style.display = !value || text.includes(lower) ? '' : 'none';
        });
      };

      const items = [
        {
          onKeyUp: (e: any) => filterList(e.target.value),
          clearSearch: () => filterList(''),
          placeholder: placeholder || 'Search',
          location: LEFT,
          search: true,
        },
      ];

      const target = document.getElementById(controlId) || undefined;
      controlBar({ target, items });
    }
  }
}

function renderSimpleList({
  container,
  options,
  onSelected,
}: {
  container: HTMLElement;
  options: SelectItemOption[];
  onSelected: (value: any[]) => void;
}) {
  const list = document.createElement('div');
  list.style.cssText = 'max-height: 380px; overflow-y: auto; padding: 0.5em 0;';

  for (const option of options) {
    const item = document.createElement('a');
    item.setAttribute('data-select-item', '');
    item.className = 'panel-block font-medium';
    item.style.cssText = 'cursor: pointer; padding: 0.5em 1em; display: block; text-decoration: none; color: inherit;';
    item.innerHTML = option.label;
    item.onmouseenter = () => (item.style.backgroundColor = '#f5f5f5');
    item.onmouseleave = () => (item.style.backgroundColor = '');
    item.onclick = (e) => {
      e.stopPropagation();
      onSelected([option]);
    };
    list.appendChild(item);
  }

  container.appendChild(list);
}
