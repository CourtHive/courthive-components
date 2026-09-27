/**
 * The score-entry card: the geometry every approach shares.
 *
 * ── Why this exists as one thing ──
 *
 * The four score-entry approaches each rendered their own complete dialog — their own header, their
 * own endings controls, their own winner question, their own submit gate. That is how they came to
 * disagree about the walkover rule, about which endings existed, about when Submit was live, and
 * about what a saved result reopened as. Every one of those was a divergence between renderers, not a
 * hard problem.
 *
 * So the card owns everything that is the same in all three, and the score region is the ONLY part
 * that varies:
 *
 *     header          title · context · format chip · approach switcher · close
 *     participant rows  name, seed, the score region's cells, the per-side "ended early" control
 *     score region      ← the only variable part: per-set inputs, a text field, or a keypad
 *     endings row     the seven match-level endings, three privileged and the rest behind Other…
 *     result band     what will be submitted, said before it is
 *     footer          Cancel left, Clear + Submit right
 *
 * A region supplies either `rowCells` (Dynamic Sets: one input per set, inside the participant rows)
 * or `block` (Free Score: one field; Dial Pad: a keypad) beneath them. Both is allowed; neither
 * renders a card with no score entry, which is legitimate for a walkover-only view.
 *
 * ── What this module does NOT do ──
 *
 * No outcome logic. Every question about what the card means is answered by `scoreEntryState.ts`,
 * which in turn asks `resolveIrregularEnding`. This file decides where things sit and what they are
 * called, and nothing else. If a rule appears here, it is in the wrong file.
 */

import { statusCodeSubtext, statusCodeDisplay, codesForStatus } from './logic/statusCodes';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { scoreEntrySummary } from './logic/scoreEntrySummary';
import { endingLabels } from './logic/irregularEnding';
import {
  emptyScoreEntryState,
  toggleBothSidesOut,
  offersBothSidesOut,
  matchEndingOptions,
  chooseMatchEnding,
  resolveReportedEnding,
  resolveScoreEntry,
  chooseSideEnding,
  chooseReasonCode,
  sideEndingOptions,
  reasonCodeStatus,
} from './logic/scoreEntryState';

import type { ScoreEntryState, ScoreEntryResolution, SideNumber } from './logic/scoreEntryState';
import type { StatusCodeGroups } from './logic/statusCodes';

import './scoreEntryCard.css';

const { RETIRED, WALKOVER, DEFAULTED } = matchUpStatusConstants;

/** Class names and attribute names used often enough that a typo in one would be silent. */
const CLS_BTN = 'chc-sec-btn';
const CLS_BTN_PILL = 'chc-sec-btn chc-sec-btn-pill';
const CLS_BTN_ICON = 'chc-sec-btn chc-sec-btn-icon';
const CLS_CHECK = 'chc-sec-check';
const CLS_SPACER = 'chc-sec-spacer';
const ARIA_PRESSED = 'aria-pressed';
const ARIA_EXPANDED = 'aria-expanded';
const CHECK_PATH = 'M20 6 9 17l-5-5';

/**
 * The row grid's fixed columns, in px.
 *
 * Named because the header row and the participant rows must use the SAME track widths or the headings
 * stop sitting over the cells they describe. `renderRows` builds one template string from these and
 * assigns it to both, which is the single source that makes the correspondence structural rather than
 * something to eyeball.
 *
 * Centring within a track is a separate guarantee, and it is why `.chc-sec-col-head` and
 * `.chc-sec-set-input` both use `justify-self`/`justify-content: center` rather than one using
 * `text-align` and the other `margin: 0 auto`. Two mechanisms that happen to agree today can diverge
 * under one edit; the same property on both cannot.
 */
const SCORE_COLUMN_PX = 62;
const ACTION_COLUMN_PX = 56;

/**
 * The three endings the design privileges as buttons in the match-level row. The rest go behind
 * "Other…". Their presence is what tells an operator the row is about the match rather than a side,
 * which is why the caption that used to say so is gone.
 */
const PRIVILEGED_MATCH_ENDINGS = ['IN_PROGRESS', 'AWAITING_RESULT', 'SUSPENDED'];

/** One-line hints for the per-side endings, which are the choice an operator gets wrong most often. */
const SIDE_ENDING_HINTS: Record<string, string> = {
  [WALKOVER]: 'Did not play at all — no score',
  [RETIRED]: 'Started, could not finish — score kept',
  [DEFAULTED]: 'Removed by the referee',
};

/**
 * One column the region contributes to the participant rows.
 *
 * `heading` and `width` travel TOGETHER deliberately. The header row and the participant rows are
 * built from this one array, so a heading can never end up over a column it does not describe — the
 * correspondence is structural rather than two lists that have to be kept the same length by hand.
 * CA asked for that alignment explicitly (2026-09-27) and this is what makes it hold rather than a
 * rule someone has to remember.
 *
 * A column with no `heading` renders no header cell, and a region whose columns are all unheaded gets
 * no header row at all — which is what Free Score and the Dial Pad want, since their single readout
 * column needs no label.
 */
export type ScoreColumn = {
  /** The heading above this column, e.g. `1st`. Omit for an unlabelled column. */
  heading?: string;
  /** A CSS grid track size. Defaults to the standard score-column width. */
  width?: string;
};

export type ScoreRegion = {
  /** The columns this region contributes to each participant row. */
  columns?: () => ScoreColumn[];
  /** The cells to place in one side's row. Must return one per column. */
  rowCells?: (sideNumber: SideNumber) => HTMLElement[];
  /** A block beneath the rows — a text field, or a keypad. */
  block?: () => HTMLElement;
  /** The score as it currently stands, for the result band. */
  scoreString?: () => string | undefined;
  /** Whether that score is a finished result. The region's judgement, never the card's. */
  isComplete?: () => boolean;
  /** The winner the score implies, when no ending overrides it. */
  winningSide?: () => SideNumber | undefined;
  /**
   * A matchUpStatus the region itself parsed out of what was typed — Free Score only.
   *
   * Used ONLY when the operator has selected no ending. See `resolveReportedEnding` for why that
   * precedence and not the other.
   */
  matchUpStatus?: () => string | undefined;
};

export type ScoreEntryCardParams = {
  sides: [{ participantName: string; seed?: string }, { participantName: string; seed?: string }];
  matchUpFormat?: string;
  /** e.g. `'R16 · Court 3'`. */
  context?: string;
  title?: string;
  /** The score region for the active approach. */
  region: ScoreRegion;
  /** The policy's reason-code groups, if the tournament has a scoring policy attached. */
  statusCodeGroups?: StatusCodeGroups;
  /** Ending labels, so a locale can supply them. */
  labels?: Record<string, string>;
  /** The approach switcher's current label, e.g. `'Dynamic Sets'`. Omit to hide the switcher. */
  approachLabel?: string;
  onSwitchApproach?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  onSubmit?: (outcome: { matchUpStatus?: string; winningSide?: number; reasonCode?: string }) => void;
  onClose?: () => void;
};

/** A card instance: its element, plus the handle the host needs to react to score-region changes. */
export type ScoreEntryCard = {
  element: HTMLElement;
  /** Re-render the band and the submit gate. Call when the score region's value changes. */
  refresh: () => void;
  /** The current ending state, for a host that needs to inspect it. */
  getState: () => ScoreEntryState;
};

export function renderScoreEntryCard(params: ScoreEntryCardParams): ScoreEntryCard {
  const labels = params.labels ?? endingLabels();
  let state: ScoreEntryState = emptyScoreEntryState;
  /** Which side's ending panel is open, if any. Presentation only — not part of the outcome. */
  let openPanelSide: SideNumber | undefined;
  let otherMenuOpen = false;

  const element = div('chc-sec');
  element.dataset.component = 'scoreEntryCard';

  const rowsContainer = div('chc-sec-rows');
  const endingsContainer = div('chc-sec-endings');
  const band = div('chc-sec-band');
  const blockContainer = div('chc-sec-score-region');
  const submitButton = button('Submit', 'chc-sec-btn chc-sec-btn-primary');

  element.append(
    header(),
    body(),
    band,
    footer(),
  );

  render();

  return {
    element,
    // `refresh` updates ONLY the derived parts — the band and the submit gate. It deliberately does
    // NOT re-render the rows.
    //
    // A score region calls this on every keystroke, and `renderRows` asks the region for fresh cells
    // via `rowCells()`. Re-rendering there would replace the very input being typed into on each
    // character: the value survives (the region holds it) but the ELEMENT does not, so focus and the
    // caret are lost and the operator can enter exactly one digit per click. `refreshDerived` is the
    // seam that keeps a live band from costing a usable keyboard.
    refresh: refreshDerived,
    getState: () => state,
  };

  // ── Structure ────────────────────────────────────────────────────────

  function header(): HTMLElement {
    const bar = div('chc-sec-header');
    bar.append(text('chc-sec-title', params.title ?? 'Score Entry'));
    if (params.context) bar.append(text('chc-sec-context', params.context));
    bar.append(div(CLS_SPACER));
    if (params.matchUpFormat) bar.append(text('chc-sec-format', params.matchUpFormat));

    if (params.approachLabel) {
      const switcher = button(params.approachLabel, CLS_BTN);
      switcher.dataset.action = 'switchApproach';
      switcher.addEventListener('click', () => params.onSwitchApproach?.());
      bar.append(switcher);
    }

    const close = button('', CLS_BTN_ICON);
    close.dataset.action = 'close';
    close.setAttribute('aria-label', 'Close');
    close.append(icon('M18 6 6 18M6 6l12 12'));
    close.addEventListener('click', () => params.onClose?.());
    bar.append(close);

    return bar;
  }

  function body(): HTMLElement {
    const main = div('chc-sec-body');
    main.append(rowsContainer, blockContainer, endingsContainer);
    return main;
  }

  function footer(): HTMLElement {
    const bar = div('chc-sec-footer');

    const cancel = button('Cancel', CLS_BTN);
    cancel.dataset.action = 'cancel';
    cancel.addEventListener('click', () => params.onCancel?.());

    const clear = button('Clear', CLS_BTN);
    clear.dataset.action = 'clear';
    clear.addEventListener('click', () => {
      state = emptyScoreEntryState;
      openPanelSide = undefined;
      otherMenuOpen = false;
      params.onClear?.();
      render();
    });

    submitButton.dataset.action = 'submit';
    submitButton.addEventListener('click', () => {
      const resolution = currentResolution();
      params.onSubmit?.({
        matchUpStatus: resolution.matchUpStatus,
        winningSide: resolution.winningSide,
        reasonCode: state.reasonCode,
      });
    });

    bar.append(cancel, div(CLS_SPACER), clear, submitButton);
    return bar;
  }

  // ── Render ───────────────────────────────────────────────────────────

  /** A full render, including the score region's cells. Used on mount and on any ending change. */
  function render(): void {
    const resolution = currentResolution();

    renderRows(resolution.winningSide);
    renderBlock();
    renderMatchEndings();
    renderDerived();
  }

  /**
   * The resolution in force: the operator's selection, or failing that whatever the region parsed.
   *
   * A selected ending always wins. Only when nothing is selected does a region-reported status apply,
   * which is what keeps Free Score's "6-4 ret" working without letting parsed text override a click.
   */
  function currentResolution(): ScoreEntryResolution {
    const selected = resolveScoreEntry(state);
    if (selected.hasEnding) return selected;

    return resolveReportedEnding(params.region.matchUpStatus?.(), params.region.winningSide?.());
  }

  /**
   * Everything that follows from the current state without rebuilding a control.
   *
   * Safe to call on every keystroke, which is the whole reason it is separate.
   */
  function refreshDerived(): void {
    renderDerived();
  }

  function renderDerived(): void {
    const resolution = currentResolution();
    renderBand(resolution);

    // ── The submit gate ──
    //
    // Live when an ending resolves, OR when the score region says the score is a finished result. The
    // OR is the point: the 95% case is a played-out match with no ending at all, and gating on the
    // ending alone would make Submit dead for it. Gating on the score alone would make a walkover
    // unsubmittable, which is the bug the four approaches each fixed differently.
    const scoreIsResult = !!params.region.isComplete?.();
    submitButton.disabled = !(resolution.isValid || (!resolution.hasEnding && scoreIsResult));
  }

  function renderRows(winningSide?: number): void {
    rowsContainer.replaceChildren();

    const columns = params.region.columns?.() ?? [];
    const scoreTracks = columns.map((column) => column.width ?? `${SCORE_COLUMN_PX}px`).join(' ');
    const template = `1fr ${scoreTracks} ${ACTION_COLUMN_PX}px`;

    // A header row only when at least one column is labelled. Free Score and the Dial Pad have a
    // single unlabelled readout column, and an empty header strip above it would be furniture.
    if (columns.some((column) => column.heading)) {
      const head = div('chc-sec-row-head');
      head.style.gridTemplateColumns = template;
      head.append(text('', 'PLAYER'), ...columns.map((column) => columnHeading(column.heading ?? '')), div(''));
      rowsContainer.append(head);
    }

    for (const sideNumber of [1, 2] as SideNumber[]) {
      rowsContainer.append(participantRow(sideNumber, template, winningSide));
      if (openPanelSide === sideNumber) rowsContainer.append(sidePanel(sideNumber));
    }
  }

  function participantRow(sideNumber: SideNumber, template: string, winningSide?: number): HTMLElement {
    const side = params.sides[sideNumber - 1];
    const row = div('chc-sec-row');
    row.style.gridTemplateColumns = template;
    row.dataset.side = String(sideNumber);
    row.dataset.ended = String(state.sideEnding?.sideNumber === sideNumber);
    row.dataset.winner = String(winningSide === sideNumber);

    const participant = div('chc-sec-participant');
    const check = div(CLS_CHECK);
    if (winningSide === sideNumber) check.append(icon(CHECK_PATH, 3));
    participant.append(check, text('chc-sec-name', side.participantName));
    if (side.seed) participant.append(text('chc-sec-seed', side.seed));

    const endedEarly = button('', CLS_BTN_ICON);
    endedEarly.dataset.action = 'endedEarly';
    endedEarly.dataset.side = String(sideNumber);
    endedEarly.title = 'Ended early';
    // The icon-only control the design shortened from "[/!\ Ended Early]" to "[/!\]". An icon with no
    // accessible name is invisible to a screen reader, and "Ended early" alone would read identically
    // on both rows — so the name carries the participant.
    endedEarly.setAttribute('aria-label', `${side.participantName} ended early`);
    endedEarly.setAttribute(ARIA_EXPANDED, String(openPanelSide === sideNumber));
    endedEarly.setAttribute(ARIA_PRESSED, String(state.sideEnding?.sideNumber === sideNumber));
    endedEarly.append(icon('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'));
    endedEarly.addEventListener('click', () => {
      openPanelSide = openPanelSide === sideNumber ? undefined : sideNumber;
      otherMenuOpen = false;
      render();
    });

    const cells = params.region.rowCells?.(sideNumber) ?? [];
    row.append(participant, ...cells, wrapRight(endedEarly));
    return row;
  }

  function sidePanel(sideNumber: SideNumber): HTMLElement {
    const side = params.sides[sideNumber - 1];
    const panel = div('chc-sec-side-panel');
    panel.dataset.panelSide = String(sideNumber);
    panel.append(text('chc-sec-side-panel-head', `What happened to ${side.participantName}?`));

    const inner = div('chc-sec-side-panel-body');

    for (const status of sideEndingOptions()) {
      const selected = state.sideEnding?.sideNumber === sideNumber && state.sideEnding.status === status;
      const option = button('', 'chc-sec-btn chc-sec-side-option');
      option.dataset.ending = status;
      option.setAttribute(ARIA_PRESSED, String(selected));

      const stack = div('chc-sec-side-option-label');
      stack.append(text('', labels[status] ?? status));
      const hint = SIDE_ENDING_HINTS[status];
      if (hint) stack.append(text('chc-sec-side-option-hint', hint));
      option.append(stack);

      option.addEventListener('click', () => {
        state = chooseSideEnding(state, sideNumber, status);
        render();
      });
      inner.append(option);
    }

    const reasonStatus = reasonCodeStatus(state);
    const codes = state.sideEnding?.sideNumber === sideNumber ? codesForStatus(params.statusCodeGroups, reasonStatus) : [];
    if (codes.length) {
      // No " - USTA" or " - USTA Policy" beside the heading (CA, 2026-09-27): the codes on offer come
      // from whatever policy is attached, and naming a governing body here would be wrong the moment
      // it is a different one.
      inner.append(text('chc-sec-reason-head', 'REASON'));
      const chips = div('chc-sec-reasons');
      for (const entry of codes) {
        const code = entry.matchUpStatusCode;
        const chip = button(statusCodeDisplay(entry), CLS_BTN_PILL);
        chip.dataset.reason = code;
        chip.setAttribute(ARIA_PRESSED, String(state.reasonCode === code));
        const subtext = statusCodeSubtext(entry);
        if (subtext) chip.title = subtext;
        chip.addEventListener('click', () => {
          state = chooseReasonCode(state, code);
          render();
        });
        chips.append(chip);
      }
      inner.append(chips);
    }

    if (state.sideEnding?.sideNumber === sideNumber && offersBothSidesOut(state)) {
      const other = params.sides[sideNumber === 1 ? 1 : 0];
      const label = document.createElement('label');
      label.className = 'chc-sec-both-out';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!state.bothSidesOut;
      box.dataset.action = 'bothSidesOut';
      box.addEventListener('change', () => {
        state = toggleBothSidesOut(state);
        render();
      });
      label.append(box, text('', `${other.participantName} did not appear either — no one advances`));
      inner.append(label);
    }

    panel.append(inner);
    return panel;
  }

  function renderBlock(): void {
    blockContainer.replaceChildren();
    const block = params.region.block?.();
    if (block) blockContainer.append(block);
  }

  function renderMatchEndings(): void {
    endingsContainer.replaceChildren();

    const all = matchEndingOptions();
    const privileged = all.filter((status) => PRIVILEGED_MATCH_ENDINGS.includes(status));
    const others = all.filter((status) => !PRIVILEGED_MATCH_ENDINGS.includes(status));

    for (const status of privileged) {
      endingsContainer.append(matchEndingButton(status, labels[status] ?? status));
    }

    if (!others.length) return;

    const otherSelected = !!state.matchEnding && others.includes(state.matchEnding);
    const other = button('Other…', CLS_BTN_PILL);
    other.dataset.action = 'other';
    // Solid when the selection was made INSIDE it, so the row still shows one selection whether it
    // came from a privileged button or from the menu.
    other.setAttribute(ARIA_PRESSED, String(otherSelected));
    other.setAttribute(ARIA_EXPANDED, String(otherMenuOpen));
    other.append(icon('m6 9 6 6 6-6', 2.5));
    other.addEventListener('click', () => {
      otherMenuOpen = !otherMenuOpen;
      render();
    });
    endingsContainer.append(other);

    if (!otherMenuOpen) return;

    const menu = div('chc-sec-other-menu');
    for (const status of others) {
      const selected = state.matchEnding === status;
      const item = button('', 'chc-sec-other-item');
      item.dataset.ending = status;
      item.setAttribute(ARIA_PRESSED, String(selected));
      const mark = div(CLS_CHECK);
      if (selected) mark.append(icon(CHECK_PATH, 3));
      item.append(mark, text('', labels[status] ?? status));
      item.addEventListener('click', () => {
        state = chooseMatchEnding(state, status);
        otherMenuOpen = false;
        render();
      });
      menu.append(item);
    }
    endingsContainer.append(menu);
  }

  function matchEndingButton(status: string, label: string): HTMLButtonElement {
    const control = button(label, CLS_BTN_PILL);
    control.dataset.ending = status;
    control.setAttribute(ARIA_PRESSED, String(state.matchEnding === status));
    control.addEventListener('click', () => {
      state = chooseMatchEnding(state, status);
      otherMenuOpen = false;
      render();
    });
    return control;
  }

  function renderBand(resolution: ReturnType<typeof resolveScoreEntry>): void {
    const reasonStatus = reasonCodeStatus(state);
    const entry = codesForStatus(params.statusCodeGroups, reasonStatus).find(
      (candidate) => candidate.matchUpStatusCode === state.reasonCode,
    );

    const summary = scoreEntrySummary({
      resolution,
      sideNames: [params.sides[0].participantName, params.sides[1].participantName],
      scoreString: params.region.scoreString?.(),
      scoreComplete: params.region.isComplete?.(),
      scoreWinningSide: params.region.winningSide?.(),
      reasonDisplay: entry ? statusCodeDisplay(entry) : undefined,
      labels,
    });

    band.replaceChildren();
    band.dataset.tone = summary.tone;
    // `role="status"` so the band is announced when it changes — it is the confirmation that a
    // part-score is about to be discarded, and a sighted-only confirmation is not one.
    band.setAttribute('role', 'status');
    band.append(text('chc-sec-band-headline', summary.headline));
    if (summary.detail) {
      band.append(div(CLS_SPACER), text('chc-sec-band-detail', summary.detail));
    }
  }
}

// ── Small DOM helpers ──────────────────────────────────────────────────

function div(className: string): HTMLDivElement {
  const element = document.createElement('div');
  if (className) element.className = className;
  return element;
}

function text(className: string, content: string): HTMLDivElement {
  const element = div(className);
  element.textContent = content;
  return element;
}

/**
 * A score-column heading, centred by the same property the input under it uses.
 *
 * Previously `text-align: center` on a stretched grid item. That aligned with the input's
 * `margin: 0 auto` only because both happened to centre in the same track — a coincidence of two
 * unrelated mechanisms, and the kind that survives review and then breaks under an unrelated edit.
 */
function columnHeading(content: string): HTMLDivElement {
  return text('chc-sec-col-head', content);
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  if (label) element.textContent = label;
  return element;
}

function wrapRight(child: HTMLElement): HTMLDivElement {
  const wrapper = div('');
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = 'flex-end';
  wrapper.append(child);
  return wrapper;
}

/** An inline stroke SVG. Never emoji, and never a font icon. */
function icon(path: string, strokeWidth = 2): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // Decorative: the accessible name is on the button, so a duplicate here would be read twice.
  svg.setAttribute('aria-hidden', 'true');
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  node.setAttribute('d', path);
  svg.append(node);
  return svg;
}
