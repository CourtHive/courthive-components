/**
 * View Toolbar — View-mode preset switcher.
 *
 * Extracted from VisTimelineBasic.stories.ts.
 * Provides Day / 3 Days / Week view buttons with CourtHive teal accent.
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

// ============================================================================
// Presets
// ============================================================================

export const VIEW_PRESETS: Record<string, ViewPreset> = {
  day: { label: '1 Day', days: 1, timeAxis: { scale: 'hour', step: 1 } },
  tournament: { label: '3 Days', days: 3, timeAxis: { scale: 'hour', step: 3 } },
  week: { label: 'Week', days: 7, timeAxis: { scale: 'hour', step: 6 } },
};

// ============================================================================
// Implementation
// ============================================================================

export function buildViewToolbar(
  onViewChange: (viewKey: string) => void,
  initialView?: string,
): HTMLElement {
  const bar = document.createElement('div');
  bar.style.cssText =
    'display:flex; align-items:center; gap:4px; padding:6px 12px; border-bottom:1px solid #e0e0e0; background:#f8f9fa; font-family:sans-serif; font-size:13px;';

  const label = document.createElement('span');
  label.textContent = 'View:';
  label.style.cssText = 'color:#666; margin-right:4px;';
  bar.appendChild(label);

  const buttons: HTMLButtonElement[] = [];
  const activeView = initialView || 'day';

  for (const [key, view] of Object.entries(VIEW_PRESETS)) {
    const btn = document.createElement('button');
    btn.textContent = view.label;
    btn.style.cssText =
      'padding:4px 12px; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:13px; background:white; color:#333;';

    if (key === activeView) {
      btn.style.background = '#218D8D';
      btn.style.color = 'white';
      btn.style.borderColor = '#218D8D';
    }

    btn.addEventListener('click', () => {
      for (const b of buttons) {
        b.style.background = 'white';
        b.style.color = '#333';
        b.style.borderColor = '#ddd';
      }
      btn.style.background = '#218D8D';
      btn.style.color = 'white';
      btn.style.borderColor = '#218D8D';
      onViewChange(key);
    });

    buttons.push(btn);
    bar.appendChild(btn);
  }

  return bar;
}
