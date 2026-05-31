/**
 * View Toolbar — View-mode preset switcher with date picker and action buttons.
 *
 * Provides a date input + Day / 3 Days / Week view buttons + optional action buttons.
 */

// ============================================================================
// Public Types
// ============================================================================

type TimeAxisScale = 'millisecond' | 'second' | 'minute' | 'hour' | 'weekday' | 'day' | 'month' | 'year';

export interface ViewPreset {
  label: string;
  days: number;
  timeAxis: { scale: TimeAxisScale; step: number };
}

export interface ViewToolbarLabels {
  view?: string;
  day1?: string;
  days3?: string;
  week?: string;
  tournament?: string;
  setDefaultAvailability?: string;
  saveToTournament?: string;
}

export interface ViewToolbarResult {
  element: HTMLElement;
  dateInput: HTMLInputElement;
  setActiveView: (viewKey: string) => void;
  setDate: (dateStr: string) => void;
  setSaveEnabled: (enabled: boolean) => void;
}

// ============================================================================
// Presets
// ============================================================================

export const VIEW_PRESETS: Record<string, ViewPreset> = {
  day: { label: '1 Day', days: 1, timeAxis: { scale: 'hour', step: 1 } },
  days3: { label: '3 Days', days: 3, timeAxis: { scale: 'hour', step: 3 } },
  week: { label: 'Week', days: 7, timeAxis: { scale: 'hour', step: 6 } },
  all: { label: 'Tournament', days: 0, timeAxis: { scale: 'hour', step: 6 } }
};

// ============================================================================
// Implementation
// ============================================================================

export function buildViewToolbar(
  onViewChange: (viewKey: string) => void,
  initialView?: string,
  onDateChange?: (dateStr: string) => void,
  options?: {
    labels?: ViewToolbarLabels;
    onSetDefaultAvailability?: () => void;
    onSave?: () => void;
  }
): ViewToolbarResult {
  const labels = options?.labels;

  const bar = document.createElement('div');
  bar.className = 'tg-view-toolbar';

  const viewLabel = document.createElement('span');
  viewLabel.textContent = (labels?.view ?? 'View') + ':';
  viewLabel.className = 'tg-view-toolbar-label';
  bar.appendChild(viewLabel);

  // Date input
  const dateInput = document.createElement('input');
  dateInput.type = 'text';
  dateInput.readOnly = true;
  dateInput.className = 'tg-view-toolbar-date';
  if (onDateChange) {
    dateInput.addEventListener('changeDate', () => {
      const val = dateInput.value;
      if (val) onDateChange(val);
    });
  }
  bar.appendChild(dateInput);

  const presetLabels: Record<string, string> = {
    day: labels?.day1 ?? '1 Day',
    days3: labels?.days3 ?? '3 Days',
    week: labels?.week ?? 'Week',
    all: labels?.tournament ?? 'Tournament'
  };

  const buttons: HTMLButtonElement[] = [];
  const viewKeys: string[] = [];
  const activeView = initialView || 'day';

  const setActiveView = (activeKey: string) => {
    buttons.forEach((btn, i) => {
      if (viewKeys[i] === activeKey) {
        btn.className = 'sp-btn sp-btn--active';
      } else {
        btn.className = 'sp-btn';
      }
    });
  };

  for (const [key] of Object.entries(VIEW_PRESETS)) {
    const btn = document.createElement('button');
    btn.textContent = presetLabels[key];
    btn.className = key === activeView ? 'sp-btn sp-btn--active' : 'sp-btn';

    btn.addEventListener('click', () => {
      setActiveView(key);
      onViewChange(key);
    });

    buttons.push(btn);
    viewKeys.push(key);
    bar.appendChild(btn);
  }

  // Spacer to push action buttons to the right
  if (options?.onSetDefaultAvailability || options?.onSave) {
    const spacer = document.createElement('div');
    spacer.className = 'tg-view-toolbar-spacer';
    bar.appendChild(spacer);
  }

  // Set Default Availability button
  if (options?.onSetDefaultAvailability) {
    const btn = document.createElement('button');
    btn.textContent = labels?.setDefaultAvailability ?? 'Set Default Availability';
    btn.className = 'sp-btn sp-btn--fill-muted';
    btn.addEventListener('click', options.onSetDefaultAvailability);
    bar.appendChild(btn);
  }

  // Save to Tournament button
  let saveBtn: HTMLButtonElement | null = null;
  if (options?.onSave) {
    saveBtn = document.createElement('button');
    saveBtn.textContent = labels?.saveToTournament ?? 'Save to Tournament';
    saveBtn.className = 'sp-btn sp-btn--fill';
    saveBtn.disabled = true;
    saveBtn.addEventListener('click', options.onSave);
    bar.appendChild(saveBtn);
  }

  const setDate = (dateStr: string) => {
    dateInput.value = dateStr;
  };

  const setSaveEnabled = (enabled: boolean) => {
    if (!saveBtn) return;
    saveBtn.disabled = !enabled;
  };

  return { element: bar, dateInput, setActiveView, setDate, setSaveEnabled };
}
