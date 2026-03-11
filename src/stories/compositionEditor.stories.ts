/**
 * Composition Editor Stories
 * Full-access editor for all Configuration fields with live matchUp preview.
 */
import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { compositions } from '../compositions/compositions';
import '../components/forms/styles';

const DESC_COLOR = 'var(--chc-text-secondary, #666)';

export default {
  title: 'Components/Composition Editor',
  tags: ['autodocs'],
};

/**
 * Default — starts with Australian composition
 */
export const Default = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Composition Editor';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    const editor = createCompositionEditor(editorContainer, {
      composition: compositions.Australian,
      compositionName: 'Australian',
      onChange: (comp) => {
        console.log('[CompositionEditor] onChange:', comp);
      },
      onSave: (saved) => {
        console.log('[CompositionEditor] onSave:', saved);
      },
    });

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'button is-info';
    saveBtn.textContent = 'Get Composition (console)';
    saveBtn.style.marginTop = '0.5em';
    saveBtn.addEventListener('click', () => {
      const result = editor.getComposition();
      console.log('[CompositionEditor] Saved:', JSON.stringify(result, null, 2));
      alert(`Saved: ${result.compositionName} (theme: ${result.theme})`);
    });
    container.appendChild(saveBtn);

    return container;
  },
};

/**
 * National — complex composition with scale attributes
 */
export const NationalPreset = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'National Composition';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'Demonstrates the most complex built-in composition with scale attributes, draw positions, and address display.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    createCompositionEditor(editorContainer, {
      composition: compositions.National,
      compositionName: 'National',
    });

    return container;
  },
};

/**
 * Read Only — view-only mode
 */
export const ReadOnly = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Read-Only Mode';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'All controls are disabled. Useful for viewing published compositions.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    createCompositionEditor(editorContainer, {
      composition: compositions.ITF,
      compositionName: 'ITF',
      readOnly: true,
    });

    return container;
  },
};

/**
 * Empty — start from scratch
 */
export const EmptyStart = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Start From Scratch';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'No initial composition — use the Theme & Preset section to load a starting point, or configure from empty.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    const editor = createCompositionEditor(editorContainer, {
      compositionName: 'My Custom',
      onChange: (comp) => {
        console.log('[CompositionEditor] onChange:', comp);
      },
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'button is-success';
    saveBtn.textContent = 'Export JSON (console)';
    saveBtn.style.marginTop = '0.5em';
    saveBtn.addEventListener('click', () => {
      const result = editor.getComposition();
      console.log(JSON.stringify(result, null, 2));
    });
    container.appendChild(saveBtn);

    return container;
  },
};
