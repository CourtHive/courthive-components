/**
 * Aggregation Section — Editable aggregation rules (buckets, decay, tiebreakers).
 */
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import type { RankingPointsEditorState } from '../types';
import {
  reFieldRowStyle,
  reFieldLabelStyle,
  reFieldInputNumberStyle,
  reFieldSelectStyle,
  reCheckboxRowStyle,
  reIconBtnDangerStyle,
  reEmptyStyle
} from '../styles';

const TIEBREAK_OPTIONS = [
  'totalPoints',
  'bestResult',
  'headToHead',
  'numberOfWins',
  'recentResults',
  'drawSize',
  'numberOfResults'
];

export function buildAggregationSection(store: RankingPointsEditorStore): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const container = document.createElement('div');
  let lastJSON = '';

  function rebuild(state: RankingPointsEditorState): void {
    const rules = state.draft.aggregationRules;
    container.innerHTML = '';

    if (!rules && state.readonly) {
      const empty = document.createElement('div');
      empty.className = reEmptyStyle();
      empty.textContent = 'No aggregation rules defined (all results summed)';
      container.appendChild(empty);
      return;
    }

    // Scalar fields
    const scalarFields: [string, string, 'number' | 'select', any, string[]?][] = [
      ['rollingPeriodDays', 'Rolling period (days)', 'number', rules?.rollingPeriodDays],
      ['bestOfCount', 'Best of count', 'number', rules?.bestOfCount],
      ['minCountableResults', 'Min countable results', 'number', rules?.minCountableResults],
      ['decayFunction', 'Decay function', 'select', rules?.decayFunction, ['none', 'linear', 'exponential', 'step']]
    ];

    for (const [field, label, type, value, options] of scalarFields) {
      if (value === undefined && state.readonly) continue;
      const row = document.createElement('div');
      row.className = reFieldRowStyle();
      const lbl = document.createElement('div');
      lbl.className = reFieldLabelStyle();
      lbl.textContent = label;
      row.appendChild(lbl);

      if (state.readonly) {
        const val = document.createElement('span');
        val.style.cssText = 'font-size:0.85rem;color:var(--sp-text)';
        val.textContent = String(value);
        row.appendChild(val);
      } else if (type === 'select') {
        const select = document.createElement('select');
        select.className = reFieldSelectStyle();
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = '(none)';
        select.appendChild(noneOpt);
        for (const opt of options ?? []) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        }
        select.value = value ?? '';
        select.addEventListener('change', () => store.setAggregationField(field, select.value || undefined));
        row.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = reFieldInputNumberStyle();
        input.value = value === undefined ? '' : String(value);
        input.placeholder = '—';
        input.addEventListener('change', () => {
          const v = input.value.trim();
          store.setAggregationField(field, v ? Number.parseInt(v, 10) : undefined);
        });
        row.appendChild(input);
      }
      container.appendChild(row);
    }

    // Boolean flags
    const boolFields: [string, string, boolean | undefined][] = [
      ['separateByGender', 'Separate by gender', rules?.separateByGender],
      ['perCategory', 'Per category', rules?.perCategory]
    ];

    for (const [field, label, value] of boolFields) {
      if (value === undefined && state.readonly) continue;
      const row = document.createElement('div');
      row.className = reCheckboxRowStyle();
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = value ?? false;
      cb.disabled = state.readonly;
      cb.addEventListener('change', () => store.setAggregationField(field, cb.checked));
      const cbLabel = document.createElement('label');
      cbLabel.textContent = label;
      row.appendChild(cb);
      row.appendChild(cbLabel);
      container.appendChild(row);
    }

    // Tiebreak criteria
    const tbHeader = document.createElement('div');
    tbHeader.style.cssText = 'font-weight:600;font-size:0.8rem;margin:0.5rem 0 0.3rem;color:var(--sp-text)';
    tbHeader.textContent = 'Tiebreak Order';
    container.appendChild(tbHeader);

    const criteria = rules?.tiebreakCriteria ?? [];
    if (criteria.length) {
      const list = document.createElement('ol');
      list.style.cssText = 'font-size:0.8rem;margin:0;padding-left:1.5rem;color:var(--sp-text)';
      for (let i = 0; i < criteria.length; i++) {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:2px';
        const text = document.createElement('span');
        text.textContent = criteria[i];
        li.appendChild(text);

        if (!state.readonly) {
          const removeBtn = document.createElement('span');
          removeBtn.className = reIconBtnDangerStyle();
          removeBtn.textContent = '\u00D7';
          removeBtn.style.cursor = 'pointer';
          removeBtn.addEventListener('click', () => store.removeTiebreakCriterion(i));
          li.appendChild(removeBtn);
        }
        list.appendChild(li);
      }
      container.appendChild(list);
    } else if (state.readonly) {
      const noCriteria = document.createElement('div');
      noCriteria.className = reEmptyStyle();
      noCriteria.textContent = 'No tiebreak criteria';
      container.appendChild(noCriteria);
    }

    if (!state.readonly) {
      const addTbWrap = document.createElement('div');
      addTbWrap.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px';
      const tbSelect = document.createElement('select');
      tbSelect.className = reFieldSelectStyle();
      tbSelect.style.fontSize = '0.75rem';
      const existing = new Set(criteria);
      const available = TIEBREAK_OPTIONS.filter((o) => !existing.has(o));
      for (const opt of available) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        tbSelect.appendChild(o);
      }
      const addTbBtn = document.createElement('button');
      addTbBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
      addTbBtn.textContent = '+ Add';
      addTbBtn.addEventListener('click', () => {
        if (tbSelect.value) store.addTiebreakCriterion(tbSelect.value);
      });
      if (available.length) {
        addTbWrap.appendChild(tbSelect);
        addTbWrap.appendChild(addTbBtn);
        container.appendChild(addTbWrap);
      }
    }

    // Counting buckets
    const buckets = rules?.countingBuckets ?? [];
    if (buckets.length || !state.readonly) {
      const bucketsHeader = document.createElement('div');
      bucketsHeader.style.cssText = 'font-weight:600;font-size:0.8rem;margin:0.5rem 0 0.3rem;color:var(--sp-text)';
      bucketsHeader.textContent = 'Counting Buckets';
      container.appendChild(bucketsHeader);

      for (let bi = 0; bi < buckets.length; bi++) {
        const bucket = buckets[bi];
        const card = document.createElement('div');
        card.style.cssText =
          'border:1px solid var(--sp-border);border-radius:8px;padding:0.4rem;margin-bottom:0.4rem;font-size:0.8rem';

        // Bucket header
        const bHeader = document.createElement('div');
        bHeader.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:0.2rem';

        if (state.readonly) {
          const title = document.createElement('span');
          title.style.cssText = 'font-weight:600;color:var(--sp-text)';
          title.textContent = bucket.bucketName || 'Bucket';
          bHeader.appendChild(title);
        } else {
          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.className = 're-field-input re-field-input--text';
          nameInput.style.cssText = 'width:120px;font-size:0.75rem;font-weight:600';
          nameInput.value = bucket.bucketName || '';
          nameInput.placeholder = 'Bucket name';
          nameInput.addEventListener('change', () => store.setCountingBucketField(bi, 'bucketName', nameInput.value));
          bHeader.appendChild(nameInput);

          const spacer = document.createElement('div');
          spacer.style.flexGrow = '1';
          bHeader.appendChild(spacer);

          const delBtn = document.createElement('span');
          delBtn.className = reIconBtnDangerStyle();
          delBtn.textContent = '\u2715';
          delBtn.style.cursor = 'pointer';
          delBtn.addEventListener('click', () => store.removeCountingBucket(bi));
          bHeader.appendChild(delBtn);
        }
        card.appendChild(bHeader);

        // Bucket fields
        const bucketFields: string[] = [];
        if (bucket.eventTypes?.length) bucketFields.push(`Events: ${bucket.eventTypes.join(', ')}`);
        if (bucket.bestOfCount !== undefined) bucketFields.push(`Best of: ${bucket.bestOfCount}`);
        if (bucket.levels?.length) bucketFields.push(`Levels: ${bucket.levels.join(', ')}`);
        if (bucket.minResults !== undefined) bucketFields.push(`Min: ${bucket.minResults}`);

        if (state.readonly && bucketFields.length) {
          const details = document.createElement('div');
          details.style.cssText = 'color:var(--sp-muted);font-size:0.75rem';
          details.textContent = bucketFields.join(' | ');
          card.appendChild(details);
        } else if (!state.readonly) {
          // bestOfCount
          const bestRow = document.createElement('div');
          bestRow.className = reFieldRowStyle();
          const bestLbl = document.createElement('div');
          bestLbl.className = reFieldLabelStyle();
          bestLbl.style.cssText = 'min-width:70px;font-size:0.75rem';
          bestLbl.textContent = 'Best of';
          bestRow.appendChild(bestLbl);
          const bestInput = document.createElement('input');
          bestInput.type = 'number';
          bestInput.className = reFieldInputNumberStyle();
          bestInput.style.fontSize = '0.75rem';
          bestInput.value = bucket.bestOfCount === undefined ? '' : String(bucket.bestOfCount);
          bestInput.addEventListener('change', () => {
            const v = bestInput.value.trim();
            store.setCountingBucketField(bi, 'bestOfCount', v ? Number.parseInt(v, 10) : undefined);
          });
          bestRow.appendChild(bestInput);
          card.appendChild(bestRow);
        }

        container.appendChild(card);
      }

      if (!state.readonly) {
        const addBucket = document.createElement('button');
        addBucket.className = 'sp-btn sp-btn--sm sp-btn--outline re-add-btn';
        addBucket.textContent = '+ Add Bucket';
        addBucket.addEventListener('click', () => store.addCountingBucket());
        container.appendChild(addBucket);
      }
    }
  }

  function update(state: RankingPointsEditorState): void {
    const currentJSON = JSON.stringify(state.draft.aggregationRules ?? {});
    if (currentJSON !== lastJSON) {
      lastJSON = currentJSON;
      rebuild(state);
    }
  }

  return { element: container, update };
}
