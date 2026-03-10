/**
 * Court Availability Modal
 *
 * Uses timepicker-ui in inline range mode for setting court operating hours.
 * Supports per-day or all-days scope selection via integrated radio buttons.
 */

import './timepicker-ui.css';

// Lazy imports shared with modernTimePicker
let TimepickerUI: any;
let PluginRegistry: any;
let RangePlugin: any;
let pluginRegistered = false;

async function ensureTimepickerLoaded() {
  if (!TimepickerUI) {
    const timepickerModule = await import('timepicker-ui');
    TimepickerUI = timepickerModule.TimepickerUI;
    PluginRegistry = timepickerModule.PluginRegistry;

    // @ts-expect-error - TS doesn't handle dynamic imports well
    const rangeModule = await import('timepicker-ui/plugins/range');
    RangePlugin = rangeModule.RangePlugin;

    if (!pluginRegistered && PluginRegistry && RangePlugin) {
      PluginRegistry.register(RangePlugin);
      pluginRegistered = true;
    }
  }
}

export interface CourtAvailabilityModalConfig {
  title: string;
  currentDay: string; // YYYY-MM-DD
  currentStartTime: string; // HH:MM
  currentEndTime: string; // HH:MM
  showScopeToggle?: boolean; // default true; false for global default
  venueBounds?: { startTime: string; endTime: string };
  onConfirm: (params: { startTime: string; endTime: string; scope: 'current-day' | 'all-days' }) => void;
  onCancel?: () => void;
  /** Custom labels for UI text */
  labels?: {
    startTime?: string;
    endTime?: string;
    applyTo?: string;
    currentDayOnly?: string; // Use ${day} as placeholder for the day label
    allDays?: string;
    cancel?: string;
    apply?: string;
    venueWarning?: string; // Use ${startTime} and ${endTime} as placeholders
  };
}

// Unique ID counter for inline containers
let instanceCounter = 0;

export async function showCourtAvailabilityModal(config: CourtAvailabilityModalConfig): Promise<void> {
  const {
    title,
    currentDay,
    currentStartTime,
    currentEndTime,
    showScopeToggle = true,
    venueBounds,
    onConfirm,
    onCancel,
    labels = {}
  } = config;

  await ensureTimepickerLoaded();

  // Format day for display (e.g., "Jun 15")
  const dayDate = new Date(currentDay + 'T12:00:00');
  const dayLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Unique container ID for this instance
  const containerId = `tp-court-avail-${++instanceCounter}`;

  // Scope state
  let selectedScope: 'current-day' | 'all-days' = showScopeToggle ? 'current-day' : 'all-days';

  // Create overlay backdrop
  const overlay = document.createElement('div');
  overlay.className = 'tg-modal';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: var(--chc-bg-overlay); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Dialog — transparent wrapper; the inline clock provides its own styled panel
  const dialog = document.createElement('div');
  dialog.style.cssText = 'max-width: 90vw;';

  // Inject a <style> to override inline mode constraints so the picker
  // matches the uncontained (modal) width and drops the double shadow.
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    #${containerId} .tp-ui--inline .tp-ui-wrapper {
      max-width: none !important;
      width: 328px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
    }
  `;
  dialog.appendChild(styleTag);

  // Hidden input for timepicker-ui (it attaches to an input element)
  const input = document.createElement('input');
  input.type = 'text';
  input.value = `${currentStartTime} - ${currentEndTime}`;
  input.dataset.timeFrom = currentStartTime;
  input.dataset.timeTo = currentEndTime;
  input.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; height: 0; width: 0;';
  dialog.appendChild(input);

  // Inline container for the clock
  const clockContainer = document.createElement('div');
  clockContainer.id = containerId;
  dialog.appendChild(clockContainer);

  // Content area below the clock (scope + warning) — injected after clock renders
  const extraContent = document.createElement('div');
  extraContent.style.cssText = 'padding: 12px 24px 0;';

  // Venue bounds warning
  if (venueBounds) {
    const warningEl = document.createElement('div');
    warningEl.className = 'tp-court-avail-warning';
    warningEl.style.cssText = `
      display: none; padding: 8px 12px; margin-bottom: 12px; border-radius: 6px;
      background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
      font-size: 12px; line-height: 1.4;
    `;
    extraContent.appendChild(warningEl);

    // We'll update this warning when the range changes
    extraContent.dataset.venueBoundsStart = venueBounds.startTime;
    extraContent.dataset.venueBoundsEnd = venueBounds.endTime;
  }

  // Scope toggle (radio group)
  if (showScopeToggle) {
    const scopeContainer = document.createElement('div');
    scopeContainer.style.cssText = 'margin-bottom: 8px;';

    const scopeLabel = document.createElement('div');
    scopeLabel.textContent = (labels.applyTo || 'Apply to') + ':';
    scopeLabel.style.cssText =
      'font-size: 12px; color: var(--chc-text-secondary); margin-bottom: 6px; font-weight: 500;';
    scopeContainer.appendChild(scopeLabel);

    const radioName = `availability-scope-${containerId}`;

    const makeRadio = (value: 'current-day' | 'all-days', label: string, checked: boolean): void => {
      const row = document.createElement('label');
      row.style.cssText =
        'display: flex; align-items: center; gap: 8px; padding: 3px 0; cursor: pointer; font-size: 13px; color: var(--chc-text-primary);';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = radioName;
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

    const currentDayLabel = labels.currentDayOnly
      ? labels.currentDayOnly.replace('${day}', dayLabel)
      : `Current day only (${dayLabel})`;
    makeRadio('current-day', currentDayLabel, true);
    makeRadio('all-days', labels.allDays || 'All tournament days', false);

    extraContent.appendChild(scopeContainer);
  }

  overlay.appendChild(dialog);

  // Click backdrop to dismiss
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      onCancel?.();
    }
  });

  document.body.appendChild(overlay);

  // Create inline timepicker with range and built-in OK/Cancel buttons
  const picker = new TimepickerUI(input, {
    range: {
      enabled: true,
      fromLabel: labels.startTime || 'Start',
      toLabel: labels.endTime || 'End'
    },
    clock: {
      type: '12h',
      incrementMinutes: 5
    },
    ui: {
      theme: 'crane',
      inline: {
        enabled: true,
        containerId,
        showButtons: true
      }
    },
    labels: {
      ok: labels.apply || 'Apply',
      cancel: labels.cancel || 'Cancel'
    },
    callbacks: {
      onRangeConfirm: (data: any) => {
        const startTime = data.from || currentStartTime;
        const endTime = data.to || currentEndTime;
        cleanup();
        onConfirm({ startTime, endTime, scope: selectedScope });
      },
      onCancel: () => {
        cleanup();
        onCancel?.();
      }
    }
  });

  picker.create();

  // Inject title and extra content into the inline modal's wrapper,
  // so they inherit the timepicker's [data-theme] CSS variables.
  // DOM structure: .tp-ui-modal > .tp-ui-wrapper > [header, clock, .tp-ui-footer]
  const wrapper = clockContainer.querySelector('.tp-ui-wrapper');
  const footer = wrapper?.querySelector('.tp-ui-footer');

  // Title — prepend inside wrapper so it inherits --tp-bg / --tp-text from the theme
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    text-align: center; font-size: 16px; font-weight: 600;
    padding: 12px 24px 4px;
    background: var(--tp-bg); color: var(--tp-text);
  `;
  if (wrapper) {
    wrapper.prepend(titleEl);
  } else {
    clockContainer.prepend(titleEl);
  }

  if (footer && wrapper) {
    footer.before(extraContent);
  } else {
    dialog.appendChild(extraContent);
  }

  // Update venue warning when range switches
  if (venueBounds) {
    const warningEl = extraContent.querySelector('.tp-court-avail-warning') as HTMLElement;
    const updateWarning = (from?: string, to?: string) => {
      if (!warningEl || !from || !to || from === '--:--' || to === '--:--') return;
      const exceedsStart = from < venueBounds.startTime;
      const exceedsEnd = to > venueBounds.endTime;
      if (exceedsStart || exceedsEnd) {
        const warningTemplate =
          labels.venueWarning ||
          'Venue hours are ${startTime}\u2013${endTime}. The venue will be widened to accommodate this change.';
        warningEl.textContent = warningTemplate
          .replace('${startTime}', venueBounds.startTime)
          .replace('${endTime}', venueBounds.endTime);
        warningEl.style.display = 'block';
      } else {
        warningEl.style.display = 'none';
      }
    };
    // Check initial state
    updateWarning(currentStartTime, currentEndTime);
  }

  function cleanup() {
    if (picker?.destroy) picker.destroy();
    overlay.remove();
  }
}
