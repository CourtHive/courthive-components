/**
 * Court Availability Modal
 *
 * Simple HTML modal (no third-party library) for setting court operating hours.
 * Supports per-day or all-days scope selection.
 */

export interface CourtAvailabilityModalConfig {
  title: string;
  currentDay: string; // YYYY-MM-DD
  currentStartTime: string; // HH:MM
  currentEndTime: string; // HH:MM
  showScopeToggle?: boolean; // default true; false for global default
  onConfirm: (params: { startTime: string; endTime: string; scope: 'current-day' | 'all-days' }) => void;
  onCancel?: () => void;
}

export function showCourtAvailabilityModal(config: CourtAvailabilityModalConfig): void {
  const {
    title,
    currentDay,
    currentStartTime,
    currentEndTime,
    showScopeToggle = true,
    onConfirm,
    onCancel,
  } = config;

  // Format day for display (e.g., "Jun 15")
  const dayDate = new Date(currentDay + 'T12:00:00');
  const dayLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Create overlay backdrop
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.4); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white; border-radius: 8px; padding: 24px;
    width: 360px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  `;

  // Title
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-weight: 700; font-size: 16px; color: #333; margin-bottom: 20px;';
  dialog.appendChild(titleEl);

  // Time inputs container
  const timeRow = document.createElement('div');
  timeRow.style.cssText = 'display: flex; gap: 16px; margin-bottom: 20px;';

  const makeTimeInput = (label: string, value: string): HTMLInputElement => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'flex: 1;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 500;';

    const input = document.createElement('input');
    input.type = 'time';
    input.value = value;
    input.style.cssText = `
      width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px;
      font-size: 14px; color: #333; box-sizing: border-box;
    `;

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    timeRow.appendChild(wrapper);
    return input;
  };

  const startInput = makeTimeInput('Start Time', currentStartTime);
  const endInput = makeTimeInput('End Time', currentEndTime);
  dialog.appendChild(timeRow);

  // Scope toggle (radio group)
  let selectedScope: 'current-day' | 'all-days' = 'current-day';

  if (showScopeToggle) {
    const scopeContainer = document.createElement('div');
    scopeContainer.style.cssText = 'margin-bottom: 20px;';

    const scopeLabel = document.createElement('div');
    scopeLabel.textContent = 'Apply to:';
    scopeLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 500;';
    scopeContainer.appendChild(scopeLabel);

    const makeRadio = (value: 'current-day' | 'all-days', label: string, checked: boolean): void => {
      const row = document.createElement('label');
      row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; font-size: 13px; color: #444;';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'availability-scope';
      radio.value = value;
      radio.checked = checked;
      radio.style.cursor = 'pointer';
      radio.addEventListener('change', () => {
        if (radio.checked) selectedScope = value;
      });

      const text = document.createElement('span');
      text.textContent = label;

      row.appendChild(radio);
      row.appendChild(text);
      scopeContainer.appendChild(row);
    };

    makeRadio('current-day', `Current day only (${dayLabel})`, true);
    makeRadio('all-days', 'All tournament days', false);

    dialog.appendChild(scopeContainer);
  } else {
    selectedScope = 'all-days';
  }

  // Buttons
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px;
    background: white; color: #666; font-size: 13px; cursor: pointer; font-weight: 500;
  `;
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    onCancel?.();
  });

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.style.cssText = `
    padding: 8px 16px; border: 1px solid #218D8D; border-radius: 4px;
    background: #218D8D; color: white; font-size: 13px; cursor: pointer; font-weight: 600;
  `;
  applyBtn.addEventListener('click', () => {
    overlay.remove();
    onConfirm({
      startTime: startInput.value,
      endTime: endInput.value,
      scope: selectedScope,
    });
  });

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(applyBtn);
  dialog.appendChild(buttonRow);

  overlay.appendChild(dialog);

  // Click backdrop to dismiss
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel?.();
    }
  });

  document.body.appendChild(overlay);

  // Focus start input
  startInput.focus();
}
