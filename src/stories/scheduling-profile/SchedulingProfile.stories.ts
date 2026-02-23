/**
 * Scheduling Profile — Full Integration Stories
 *
 * Tests the complete 3-panel scheduling profile builder with:
 * - Date navigation with issue badges
 * - Venue board with drag-and-drop
 * - Round catalog with search/filter/group
 * - Inspector panel for selected cards
 * - Issues panel with fix actions
 * - Validation (duplicates, precedence, date availability)
 *
 * Stories:
 * - EmptyProfile: Start from scratch, drag rounds to build a schedule
 * - PrePopulated: Correctly scheduled rounds across multiple dates/venues
 * - WithErrors: Intentional precedence + duplicate errors for testing validation
 * - MultiVenue: Larger scenario with extended dates
 */

import 'tippy.js/dist/tippy.css';

import {
  SchedulingProfileControl,
  createSchedulingProfile,
} from '../../components/scheduling-profile';

import {
  ROUND_CATALOG,
  DATES,
  DATES_EXTENDED,
  EMPTY_PROFILE,
  VALID_PROFILE,
  ERROR_PROFILE,
  makeBaseConfig,
  makeTemporalAdapter,
} from './data';

export default {
  title: 'Scheduling Profile/Full',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const DARK_BG = 'background: linear-gradient(180deg, #070a0f, #0b1020 40%, #070a0f);';
const ROOT_STYLE = DARK_BG + 'min-height: 100vh;';
const INFO_STYLE =
  'font-size: 12px; color: #94a3b8; padding: 12px 16px; font-family: ui-sans-serif, system-ui, sans-serif;';

function addConsoleLog(container: HTMLElement, control: SchedulingProfileControl): void {
  const footer = document.createElement('div');
  footer.style.cssText =
    'padding: 12px 16px; border-top: 1px solid #1f2937; font-size: 12px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; gap: 12px; align-items: center;';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Profile (console)';
  exportBtn.style.cssText =
    'padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(96,165,250,0.35); background: rgba(96,165,250,0.12); color: #e5e7eb; cursor: pointer; font-size: 12px;';
  exportBtn.addEventListener('click', () => {
    const profile = control.getProfile();
    console.log('Scheduling Profile:', JSON.stringify(profile, null, 2));

    const state = control.getStore().getState();
    statusEl.textContent = `Exported! ${state.issueIndex.counts.total} issues (${state.issueIndex.counts.ERROR} errors). See browser console.`;
  });

  const statusEl = document.createElement('span');
  statusEl.textContent = 'Drag rounds from the catalog (right) to a venue lane (center).';

  footer.appendChild(exportBtn);
  footer.appendChild(statusEl);
  container.appendChild(footer);
}

// ============================================================================
// Empty Profile
// ============================================================================

export const EmptyProfile = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Empty profile. Drag rounds from the catalog (right panel) into venue lanes (center). Dates are listed on the left.';
    root.appendChild(info);

    const container = document.createElement('div');
    root.appendChild(container);

    const control = createSchedulingProfile(
      makeBaseConfig({
        initialProfile: EMPTY_PROFILE,
        onProfileChanged: (profile) => {
          const totalRounds = profile.reduce(
            (sum, day) => sum + day.venues.reduce((vs, v) => vs + v.rounds.length, 0),
            0,
          );
          console.log(`Profile changed: ${totalRounds} rounds placed`);
        },
      }),
      container,
    );

    addConsoleLog(root, control);
    return root;
  },
};

// ============================================================================
// Pre-Populated (Valid)
// ============================================================================

export const PrePopulated = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Pre-populated with valid round placements across 3 dates and 3 venues. Click dates to switch views. Click cards to inspect. Try dragging cards between venues.';
    root.appendChild(info);

    const container = document.createElement('div');
    root.appendChild(container);

    const control = createSchedulingProfile(
      makeBaseConfig({ initialProfile: VALID_PROFILE }),
      container,
    );

    addConsoleLog(root, control);
    return root;
  },
};

// ============================================================================
// With Errors
// ============================================================================

export const WithErrors = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>Intentional validation errors:</strong>',
      '1. <em>Precedence violation</em> \u2014 R16 is placed before R32 in the same draw (Boys U16 Singles Main)',
      '2. <em>Duplicate round</em> \u2014 R16 appears in both Venue A and Venue B',
      'Check the Issues panel (left) for details and fix actions.',
    ].join('<br>');
    root.appendChild(info);

    const container = document.createElement('div');
    root.appendChild(container);

    const control = createSchedulingProfile(
      makeBaseConfig({
        initialProfile: ERROR_PROFILE,
        onFixAction: (action) => {
          console.log('Fix action delegated to host:', action.kind, action);
        },
      }),
      container,
    );

    addConsoleLog(root, control);
    return root;
  },
};

// ============================================================================
// Multi-Venue Extended (7 days)
// ============================================================================

export const MultiVenueExtended = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      '7-day schedule with 3 venues and the full round catalog (19 rounds across 3 events). Build a week-long schedule by distributing rounds across dates.';
    root.appendChild(info);

    const container = document.createElement('div');
    root.appendChild(container);

    const control = createSchedulingProfile(
      makeBaseConfig({
        schedulableDates: DATES_EXTENDED,
        temporalAdapter: makeTemporalAdapter(DATES_EXTENDED),
        initialProfile: EMPTY_PROFILE,
      }),
      container,
    );

    addConsoleLog(root, control);
    return root;
  },
};

// ============================================================================
// Programmatic Control
// ============================================================================

export const ProgrammaticControl = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Demonstrates programmatic control of the store. Use the buttons below to manipulate the profile.';
    root.appendChild(info);

    // Button bar
    const btnBar = document.createElement('div');
    btnBar.style.cssText =
      'display: flex; gap: 8px; padding: 8px 16px; font-family: ui-sans-serif, system-ui, sans-serif;';
    root.appendChild(btnBar);

    const container = document.createElement('div');
    root.appendChild(container);

    const control = createSchedulingProfile(
      makeBaseConfig({ initialProfile: EMPTY_PROFILE }),
      container,
    );
    const store = control.getStore();

    // Status text
    const status = document.createElement('div');
    status.style.cssText =
      'padding: 8px 16px; font-size: 12px; color: #60a5fa; font-family: ui-sans-serif, system-ui, sans-serif;';
    root.appendChild(status);

    function updateStatus(): void {
      const state = store.getState();
      const total = state.profileDraft.reduce(
        (sum, day) => sum + day.venues.reduce((vs, v) => vs + v.rounds.length, 0),
        0,
      );
      status.textContent = `Rounds placed: ${total} | Issues: ${state.issueIndex.counts.total} (${state.issueIndex.counts.ERROR} errors) | Date: ${state.selectedDate}`;
    }

    store.subscribe(updateStatus);
    updateStatus();

    const makeBtn = (text: string, handler: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText =
        'padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(148,163,184,0.25); background: rgba(15,23,42,0.75); color: #e5e7eb; cursor: pointer; font-size: 12px;';
      btn.addEventListener('click', handler);
      btnBar.appendChild(btn);
      return btn;
    };

    // Add R32 to day 1, venue A
    makeBtn('Add R32 to Day 1 / Venue A', () => {
      const result = store.dropRound(
        { type: 'CATALOG_ROUND', roundRef: ROUND_CATALOG[0] },
        { date: DATES[0], venueId: 'VENUE_A', index: 0 },
      );
      status.textContent = result.ok
        ? 'Added R32 successfully!'
        : `Rejected: ${result.errorMessage}`;
    });

    // Add R16 to day 2, venue A
    makeBtn('Add R16 to Day 2 / Venue A', () => {
      store.selectDate(DATES[1]);
      const result = store.dropRound(
        { type: 'CATALOG_ROUND', roundRef: ROUND_CATALOG[1] },
        { date: DATES[1], venueId: 'VENUE_A', index: 0 },
      );
      status.textContent = result.ok
        ? 'Added R16 successfully!'
        : `Rejected: ${result.errorMessage}`;
    });

    // Navigate dates
    makeBtn('Go to Day 1', () => store.selectDate(DATES[0]));
    makeBtn('Go to Day 2', () => store.selectDate(DATES[1]));
    makeBtn('Go to Day 3', () => store.selectDate(DATES[2]));

    // Search catalog
    makeBtn('Search "doubles"', () => store.setCatalogSearch('doubles'));
    makeBtn('Clear search', () => store.setCatalogSearch(''));

    // Group by
    makeBtn('Group by Draw', () => store.setCatalogGroupBy('draw'));
    makeBtn('Group by Round', () => store.setCatalogGroupBy('round'));
    makeBtn('Group by Event', () => store.setCatalogGroupBy('event'));

    addConsoleLog(root, control);
    return root;
  },
};
