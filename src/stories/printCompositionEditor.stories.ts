/**
 * Print Composition Editor Stories
 *
 * Editor for pdf-factory's CompositionConfig (per print type). Distinct
 * from the matchUp-visualization Composition Editor — see
 * `components/print-composition-editor/printCompositionEditor.ts`.
 */
import { createPrintCompositionEditor } from '../components/print-composition-editor/printCompositionEditor';
import type { PrintType } from '../components/print-composition-editor/printCompositionEditorTypes';

export default {
  title: 'Components/Print Composition Editor',
  tags: ['autodocs'],
  argTypes: {
    printType: {
      control: { type: 'select' },
      options: ['draw', 'schedule', 'playerList', 'courtCard', 'signInSheet', 'matchCard'] as PrintType[],
    },
    readOnly: { control: 'boolean' },
  },
};

function renderEditor(args: { printType: PrintType; readOnly: boolean }): HTMLElement {
  const container = document.createElement('div');
  container.style.padding = '16px';
  container.style.maxWidth = '1100px';

  const title = document.createElement('h2');
  title.textContent = `Print Composition — ${args.printType}`;
  title.style.marginBottom = '12px';
  container.appendChild(title);

  const editorHost = document.createElement('div');
  container.appendChild(editorHost);

  createPrintCompositionEditor(editorHost, {
    printType: args.printType,
    readOnly: args.readOnly,
    config: {
      header: { layout: 'itf', tournamentName: 'Sample Tournament' },
      footer: { layout: 'standard', showTimestamp: true, showPageNumbers: true },
    },
    onChange: (cfg) => {
       
      console.log('[PrintCompositionEditor] onChange:', cfg);
    },
    onSave: (cfg) => {
       
      console.log('[PrintCompositionEditor] onSave:', cfg);
      window.alert('Saved — see console for the resolved CompositionConfig.');
    },
  });

  return container;
}

export const Draw = {
  render: renderEditor,
  args: { printType: 'draw' as PrintType, readOnly: false },
};

export const Schedule = {
  render: renderEditor,
  args: { printType: 'schedule' as PrintType, readOnly: false },
};

export const ReadOnly = {
  render: renderEditor,
  args: { printType: 'draw' as PrintType, readOnly: true },
};

export const PlaceholderType = {
  render: renderEditor,
  args: { printType: 'courtCard' as PrintType, readOnly: false },
};
