/**
 * Composition Catalog Stories
 *
 * Standalone demonstration of the composition catalog workflow:
 * browsing built-in compositions, creating custom copies, editing, and
 * the full round-trip from editor → saved composition → preview.
 *
 * This simulates what TMX's Templates > Compositions tab does,
 * without requiring the TMX app or IndexedDB.
 */

import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import type { Composition, MatchUp } from '../types';
import type { SavedComposition } from '../components/composition-editor/compositionEditorTypes';
import { mocksEngine, queryGovernor } from 'tods-competition-factory';

export default {
  title: 'Components/Composition Catalog',
};

function generatePreviewMatchUps(): MatchUp[] {
  const tournamentRecord = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, generate: true, eventName: 'Singles', completeAllMatchUps: true }],
    completeAllMatchUps: true,
    participantsProfile: { withScaleValues: true },
  }).tournamentRecord;

  return (queryGovernor.allTournamentMatchUps({ tournamentRecord }).matchUps ?? [])
    .filter((m: any) => m.matchUpType === 'SINGLES')
    .slice(0, 3) as MatchUp[];
}

function renderPreviewRow(comp: Composition, matchUps: MatchUp[]): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'margin-bottom:8px;';
  for (const mu of matchUps.slice(0, 2)) {
    const el = renderMatchUp({ matchUp: mu, composition: comp, isLucky: true });
    const themed = renderContainer({ theme: comp.theme, content: el });
    themed.style.marginBottom = '4px';
    row.appendChild(themed);
  }
  return row;
}

// ── Browse Built-in Compositions ─────────────────────────

export const BrowseBuiltins = {
  render: () => {
    const matchUps = generatePreviewMatchUps();

    const outer = document.createElement('div');
    outer.style.cssText = 'max-width:700px; font-family:sans-serif;';

    const title = document.createElement('h3');
    title.textContent = `Built-in Compositions (${Object.keys(compositions).length})`;
    title.style.cssText = 'font-size:14px; margin-bottom:12px;';
    outer.appendChild(title);

    for (const [name, comp] of Object.entries(compositions)) {
      const card = document.createElement('div');
      card.style.cssText =
        'border:1px solid var(--chc-border-primary, #dee2e6); border-radius:6px; padding:12px; margin-bottom:12px; background:var(--chc-bg-primary, #fff);';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';

      const nameEl = document.createElement('strong');
      nameEl.textContent = name;
      nameEl.style.fontSize = '13px';

      const flags = Object.entries(comp.configuration || {})
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      const flagsEl = document.createElement('span');
      flagsEl.textContent = flags.length ? flags.join(', ') : '(no flags)';
      flagsEl.style.cssText = 'font-size:11px; color:var(--chc-text-muted, #999);';

      header.append(nameEl, flagsEl);
      card.appendChild(header);
      card.appendChild(renderPreviewRow(comp, matchUps));

      outer.appendChild(card);
    }

    return outer;
  },
};

// ── Editor Integration ───────────────────────────────────

export const EditorWithPreview = {
  args: { preset: 'Australian' },
  argTypes: {
    preset: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const presetName = args.preset || 'Australian';
    const preset = compositions[presetName];
    const matchUps = generatePreviewMatchUps();

    const outer = document.createElement('div');
    outer.style.cssText = 'max-width:900px; font-family:sans-serif;';

    const info = document.createElement('p');
    info.style.cssText = 'font-size:12px; color:var(--chc-text-muted); margin-bottom:12px;';
    info.textContent = `Editing "${presetName}" composition. Changes update the live preview below.`;
    outer.appendChild(info);

    // Live preview area
    const previewArea = document.createElement('div');
    previewArea.style.cssText = 'margin-bottom:16px; padding:12px; border:1px solid var(--chc-border-primary, #dee2e6); border-radius:6px; background:var(--chc-bg-primary, #fff);';
    const previewLabel = document.createElement('div');
    previewLabel.style.cssText = 'font-size:11px; color:var(--chc-text-muted); margin-bottom:8px;';
    previewLabel.textContent = 'Live Preview';
    previewArea.appendChild(previewLabel);

    function updatePreview(comp: Composition) {
      // Remove old matchUps but keep label
      while (previewArea.children.length > 1) previewArea.removeChild(previewArea.lastChild!);
      previewArea.appendChild(renderPreviewRow(comp, matchUps));
    }

    updatePreview(preset);
    outer.appendChild(previewArea);

    // Editor
    const editorContainer = document.createElement('div');
    const editor = createCompositionEditor(editorContainer, {
      compositionName: presetName,
      composition: preset,
      onChange: ({ theme, configuration }) => {
        updatePreview({ theme, configuration });
      },
    });
    outer.appendChild(editorContainer);

    // Save button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:12px; display:flex; gap:8px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Get Composition (console)';
    saveBtn.style.cssText =
      'padding:6px 12px; border:1px solid var(--chc-border-primary, #dee2e6); border-radius:4px; background:var(--chc-bg-primary, #fff); cursor:pointer; font-size:12px;';
    saveBtn.onclick = () => {
      const saved = editor.getComposition();
      console.log('[CompositionCatalog] SavedComposition:', JSON.stringify(saved, null, 2));
      alert(`Saved: ${saved.compositionName} (theme: ${saved.theme})\nSee console for full JSON.`);
    };
    btnRow.appendChild(saveBtn);
    outer.appendChild(btnRow);

    return outer;
  },
};

// ── Full Catalog Workflow (Browse → Copy → Edit → Save) ──

export const FullWorkflow = {
  render: () => {
    const matchUps = generatePreviewMatchUps();
    const customStore: SavedComposition[] = [];

    const outer = document.createElement('div');
    outer.style.cssText = 'max-width:900px; font-family:sans-serif;';

    const title = document.createElement('h3');
    title.textContent = 'Composition Catalog — Full Workflow';
    title.style.cssText = 'font-size:14px; margin-bottom:4px;';
    outer.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'font-size:12px; color:var(--chc-text-muted); margin-bottom:16px;';
    subtitle.textContent = 'Click a built-in to view (read-only) → "Use as template" to copy → edit → save. Custom compositions appear at bottom.';
    outer.appendChild(subtitle);

    // Layout: catalog left, editor right
    const layout = document.createElement('div');
    layout.style.cssText = 'display:flex; gap:16px;';

    const catalogCol = document.createElement('div');
    catalogCol.style.cssText = 'width:200px; flex-shrink:0;';

    const editorCol = document.createElement('div');
    editorCol.style.cssText = 'flex:1; min-width:0;';

    layout.append(catalogCol, editorCol);
    outer.appendChild(layout);

    let activeEditor: ReturnType<typeof createCompositionEditor> | null = null;

    function renderCatalog() {
      catalogCol.innerHTML = '';

      // Built-in group
      const builtinHeader = document.createElement('div');
      builtinHeader.style.cssText = 'font-size:11px; font-weight:600; color:var(--chc-text-muted); margin-bottom:6px; text-transform:uppercase;';
      builtinHeader.textContent = `Default (${Object.keys(compositions).length})`;
      catalogCol.appendChild(builtinHeader);

      for (const [name, comp] of Object.entries(compositions)) {
        const card = document.createElement('button');
        card.style.cssText =
          'display:block; width:100%; text-align:left; padding:6px 8px; margin-bottom:4px; border:1px solid var(--chc-border-primary, #dee2e6); border-radius:4px; background:var(--chc-bg-primary, #fff); cursor:pointer; font-size:12px; font-family:inherit;';
        card.textContent = name;
        card.onclick = () => selectBuiltin(name, comp);
        catalogCol.appendChild(card);
      }

      // Custom group
      if (customStore.length > 0) {
        const customHeader = document.createElement('div');
        customHeader.style.cssText = 'font-size:11px; font-weight:600; color:var(--chc-text-muted); margin-top:12px; margin-bottom:6px; text-transform:uppercase;';
        customHeader.textContent = `Custom (${customStore.length})`;
        catalogCol.appendChild(customHeader);

        for (const saved of customStore) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex; align-items:center; gap:4px; margin-bottom:4px;';

          const card = document.createElement('button');
          card.style.cssText =
            'flex:1; text-align:left; padding:6px 8px; border:1px solid var(--chc-color-primary, #3b82f6); border-radius:4px; background:var(--chc-bg-primary, #fff); cursor:pointer; font-size:12px; font-family:inherit; color:var(--chc-color-primary, #3b82f6);';
          card.textContent = saved.compositionName;
          card.onclick = () => selectCustom(saved);

          const delBtn = document.createElement('button');
          delBtn.style.cssText = 'border:none; background:none; color:#dc3545; cursor:pointer; font-size:14px; padding:2px 4px;';
          delBtn.textContent = '×';
          delBtn.onclick = () => {
            const idx = customStore.indexOf(saved);
            if (idx >= 0) customStore.splice(idx, 1);
            renderCatalog();
            editorCol.innerHTML = '<p style="font-size:12px; color:var(--chc-text-muted);">Deleted. Select another composition.</p>';
          };

          row.append(card, delBtn);
          catalogCol.appendChild(row);
        }
      }
    }

    function selectBuiltin(name: string, comp: Composition) {
      destroyEditor();
      editorCol.innerHTML = '';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;';

      const titleEl = document.createElement('strong');
      titleEl.textContent = `${name} (read-only)`;
      titleEl.style.fontSize = '13px';

      const useBtn = document.createElement('button');
      useBtn.textContent = 'Use as template';
      useBtn.style.cssText =
        'padding:4px 10px; border:1px solid var(--chc-color-primary, #3b82f6); border-radius:4px; background:var(--chc-bg-primary, #fff); color:var(--chc-color-primary, #3b82f6); cursor:pointer; font-size:11px;';
      useBtn.onclick = () => openEditor(`${name} (copy)`, comp, false);

      header.append(titleEl, useBtn);
      editorCol.appendChild(header);

      // Read-only preview
      editorCol.appendChild(renderPreviewRow(comp, matchUps));

      const editorBox = document.createElement('div');
      activeEditor = createCompositionEditor(editorBox, {
        compositionName: name,
        composition: comp,
        readOnly: true,
      });
      editorCol.appendChild(editorBox);
    }

    function selectCustom(saved: SavedComposition) {
      const comp: Composition = { theme: saved.theme, configuration: saved.configuration };
      openEditor(saved.compositionName, comp, true);
    }

    function openEditor(name: string, comp: Composition, _isCustom: boolean) {
      destroyEditor();
      editorCol.innerHTML = '';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;';

      const titleEl = document.createElement('strong');
      titleEl.textContent = name;
      titleEl.style.fontSize = '13px';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText =
        'padding:4px 10px; border:1px solid #28a745; border-radius:4px; background:#28a745; color:#fff; cursor:pointer; font-size:11px;';
      saveBtn.onclick = () => {
        if (!activeEditor) return;
        const saved = activeEditor.getComposition();
        const promptName = prompt('Composition name:', saved.compositionName);
        if (!promptName) return;
        saved.compositionName = promptName;

        // Upsert into custom store
        const existing = customStore.findIndex((c) => c.compositionName === promptName);
        if (existing >= 0) customStore[existing] = saved;
        else customStore.push(saved);

        console.log('[CompositionCatalog] Saved:', JSON.stringify(saved, null, 2));
        renderCatalog();
        selectCustom(saved);
      };

      header.append(titleEl, saveBtn);
      editorCol.appendChild(header);

      const editorBox = document.createElement('div');
      activeEditor = createCompositionEditor(editorBox, {
        compositionName: name,
        composition: comp,
      });
      editorCol.appendChild(editorBox);
    }

    function destroyEditor() {
      if (activeEditor) {
        activeEditor.destroy();
        activeEditor = null;
      }
    }

    renderCatalog();

    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'font-size:12px; color:var(--chc-text-muted);';
    emptyMsg.textContent = 'Select a composition from the left to view or edit.';
    editorCol.appendChild(emptyMsg);

    return outer;
  },
};
