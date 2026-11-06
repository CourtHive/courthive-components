/**
 * The dual's home team in the scorecard header: a HOME label above the home team's name, where it falls (sides never
 * move), and, when the caller can record it, a small gear in the header's corner that edits it.
 *
 * CA, 2026-11-05: the `[Set as home]` buttons under each name made the header look like a form. The gear opens an edit
 * in place: the teams become the targets, a bar beneath says what to do, and the gear becomes the check that saves.
 * Selecting the home team again leaves no home team. Escape or Cancel puts it back as it was. Save sends at most one
 * change; a refused save keeps the edit open with the choice.
 *
 * The editing rules live in the home draft (`createHomeDraft`); this only renders them. While the home team is edited,
 * the team-score controls are hidden, and while the team score is edited, the gear is (both in `scorecard.css`).
 */
import { createHomeDraft, type HomeChange, type HomeDraft, type ScorecardHomeOptions } from './homeSides';
import type { ScorecardLabels } from './renderCollectionCard';

const HOME_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7.2 8 2l6 5.2V14H9.6v-3.8H6.4V14H2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const GEAR_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.9 1.5h2.2l.4 1.9 1.3.7 1.8-.7 1.1 1.9-1.4 1.3v1.6l1.4 1.3-1.1 1.9-1.8-.7-1.3.7-.4 1.9H6.9l-.4-1.9-1.3-.7-1.8.7-1.1-1.9 1.4-1.3V7.3L2.3 6l1.1-1.9 1.8.7 1.3-.7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const EDITING = 'chc-scorecard-header--home-editing';
const ARIA_LABEL = 'aria-label';
const MOVE_MS = 220;
const FADE_MS = 120;

const INFERRED_TITLE = {
  VENUE: (labels?: ScorecardLabels) => labels?.homeVenue ?? 'Home (venue)',
  HOST_ORGANISATION: (labels?: ScorecardLabels) => labels?.homeHostOrganisation ?? 'Home (host organisation)'
};
const INFERRED_HINT = {
  VENUE: (labels?: ScorecardLabels) =>
    labels?.homeInferredVenueHint ?? 'Home comes from the venue — select a team to set it',
  HOST_ORGANISATION: (labels?: ScorecardLabels) =>
    labels?.homeInferredHostHint ?? 'Home comes from the host organisation — select a team to set it'
};

const fill = (template: string, name: string) => template.replaceAll(/{{\s*name\s*}}/g, name);

const iconButton = (svg: string, action: string, label: string) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'chc-scorecard-home-gear';
  element.dataset.action = action;
  element.innerHTML = svg;
  element.title = label;
  element.setAttribute(ARIA_LABEL, label);
  return element;
};

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function attachHomeEditor({
  header,
  participantIds,
  home,
  labels
}: {
  header: HTMLElement;
  /** left then right, after any `swapSides` */
  participantIds: (string | undefined)[];
  home: ScorecardHomeOptions;
  labels?: ScorecardLabels;
}): void {
  const sides = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side')];
  if (sides.length !== 2) return;
  const names = sides.map(
    (side, index) => side.querySelector('.chc-scorecard-side-name')?.textContent || String(index + 1)
  );
  const draft = createHomeDraft({ participantIds, home });

  header.classList.add('chc-scorecard-header--home');
  // a label slot above each name, held on both sides so a name never moves when the home team does
  const slots = sides.map((side) => {
    const slot = document.createElement('span');
    slot.className = 'chc-scorecard-home';
    side.prepend(slot);
    return slot;
  });
  paintLabels(draft);

  // the gear only where the home team can be recorded, and only for two teams to choose between
  if (!home.onSetHome || participantIds.some((participantId) => !participantId)) return;
  header.classList.add('chc-scorecard-header--home-editable');
  const gearButton = () => {
    const gear = iconButton(GEAR_ICON, 'edit-home', labels?.editHome ?? 'Edit home team');
    gear.addEventListener('click', open);
    return gear;
  };
  let corner = gearButton();
  header.appendChild(corner);

  function paintLabels(state: HomeDraft, animate = false): void {
    const before = animate ? visibleTagRect() : undefined;
    slots.forEach((slot, index) => {
      const shown = state.shownAs(participantIds[index]);
      slot.replaceChildren();
      slot.dataset.shown = shown ?? 'none';
      if (!shown) {
        slot.setAttribute('aria-hidden', 'true');
        return;
      }
      slot.removeAttribute('aria-hidden');
      const tag = document.createElement('span');
      tag.className = 'chc-scorecard-home-tag';
      const word = document.createElement('span');
      word.className = 'chc-scorecard-home-word';
      word.textContent = labels?.home ?? 'Home';
      const glyph = document.createElement('span');
      glyph.className = 'chc-scorecard-home-icon';
      glyph.innerHTML = HOME_ICON;
      tag.append(glyph, word);
      const basis = shown === 'inferred' ? state.inferredBasis() : undefined;
      if (basis) {
        const title = INFERRED_TITLE[basis](labels);
        tag.classList.add('chc-scorecard-home-tag--inferred');
        tag.dataset.basis = basis;
        tag.title = title;
        tag.setAttribute(ARIA_LABEL, title);
      }
      slot.appendChild(tag);
    });
    if (before) moveTag(before);
  }

  function visibleTagRect(): DOMRect | undefined {
    return header.querySelector<HTMLElement>('.chc-scorecard-home-tag')?.getBoundingClientRect();
  }

  // the label travels from where it was to where it is: a slide, or a fade for anyone who asked for less motion
  function moveTag(from: DOMRect): void {
    const tag = header.querySelector<HTMLElement>('.chc-scorecard-home-tag');
    if (!tag || typeof tag.animate !== 'function') return;
    if (reducedMotion()) {
      tag.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS });
      return;
    }
    const to = tag.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (!dx && !dy) return;
    tag.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: MOVE_MS,
      easing: 'cubic-bezier(.2,.8,.2,1)'
    });
  }

  function open(): void {
    header.classList.add(EDITING);
    let saving = false;

    // the two teams are the choice: toggles rather than radios, because selecting none is a real answer
    const group = header.querySelector<HTMLElement>('.chc-scorecard-header-body');
    group?.setAttribute('role', 'group');
    group?.setAttribute(ARIA_LABEL, labels?.homeTeam ?? 'Home team');
    const targets = sides.map((side, index) => {
      const target = document.createElement('button');
      target.type = 'button';
      target.className = 'chc-scorecard-home-target';
      target.dataset.action = 'choose-home';
      target.dataset.participantId = participantIds[index];
      target.setAttribute(ARIA_LABEL, names[index]);
      target.addEventListener('click', () => {
        if (saving || !draft.toggle(participantIds[index] as string)) return;
        paintLabels(draft, true);
        update(true);
      });
      side.appendChild(target);
      return target;
    });

    const bar = document.createElement('div');
    bar.className = 'chc-scorecard-home-bar';
    bar.setAttribute('role', 'status');
    bar.dataset.tone = 'info';
    const hint = document.createElement('span');
    hint.className = 'chc-scorecard-home-hint';
    const status = document.createElement('span');
    status.className = 'chc-scorecard-home-draft';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'chc-scorecard-home-cancel';
    cancel.dataset.action = 'cancel-home';
    cancel.textContent = labels?.cancel ?? 'Cancel';
    cancel.addEventListener('click', () => close(false));
    bar.append(hint, status, cancel);
    group?.after(bar);

    const save = iconButton(CHECK_ICON, 'save-home', labels?.saveHome ?? 'Save home team');
    save.addEventListener('click', submit);
    corner.replaceWith(save);
    corner = save;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      // the edit is the step back, not whatever holds the card
      event.preventDefault();
      event.stopPropagation();
      close(false);
    };
    header.addEventListener('keydown', onKeyDown);

    // the bar is in the page empty first, so a screen reader announces its first words
    update(false);
    setTimeout(() => update(false), 0);
    (targets.find((target) => target.dataset.participantId === draft.selected()) ?? targets[0]).focus();

    function update(changed: boolean): void {
      targets.forEach((target) =>
        target.setAttribute('aria-pressed', String(target.dataset.participantId === draft.selected()))
      );
      const basis = draft.inferredBasis();
      hint.textContent = basis
        ? INFERRED_HINT[basis](labels)
        : draft.canUnselect() || !draft.selected()
          ? (labels?.homeEditHint ?? 'Select the home team · select it again for no home team')
          : (labels?.homeEditHintNoClear ?? 'Select the home team');
      // only a change of choice rewrites the draft line: a refusal's message stays until the next choice
      if (!changed) return;
      status.textContent = draft.isDirty() ? draftStatus() : '';
      bar.dataset.tone = 'info';
    }

    function draftStatus(): string {
      const index = participantIds.indexOf(draft.selected());
      if (index < 0) return labels?.homeDraftNone ?? 'No home team set (unsaved)';
      return fill(labels?.homeDraft ?? 'Home: {{name}} (unsaved)', names[index]);
    }

    async function submit(): Promise<void> {
      const change = draft.change();
      if (!change) return close(false);
      saving = true;
      header.setAttribute('aria-busy', 'true');
      [save, cancel, ...targets].forEach((control) => (control.disabled = true));
      const saved = await send(change);
      saving = false;
      header.removeAttribute('aria-busy');
      if (saved) {
        draft.commit();
        return close(true);
      }
      [save, cancel, ...targets].forEach((control) => (control.disabled = false));
      status.textContent = labels?.homeSaveFailed ?? 'Not saved — save again or cancel';
      bar.dataset.tone = 'warn';
      save.focus();
    }

    function close(saved: boolean): void {
      if (!saved) draft.reset();
      header.removeEventListener('keydown', onKeyDown);
      targets.forEach((target) => target.remove());
      bar.remove();
      group?.removeAttribute('role');
      group?.removeAttribute(ARIA_LABEL);
      header.classList.remove(EDITING);
      paintLabels(draft);
      const gear = gearButton();
      corner.replaceWith(gear);
      corner = gear;
      gear.focus();
    }
  }

  async function send(change: HomeChange): Promise<boolean> {
    try {
      const result = 'set' in change ? await home.onSetHome?.(change.set) : await home.onClearHome?.();
      return result !== false;
    } catch {
      return false;
    }
  }
}
