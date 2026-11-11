/**
 * Schedule Page — the words a grid cell shows for a matchUp's schedule annotations.
 *
 * A schedule stores time modifiers as enum identifiers (`NOT_BEFORE`, `TO_BE_ANNOUNCED`); the cell
 * must never display those. A consumer supplies localised labels per modifier, any modifier it does
 * not cover falls back to the English default, and a modifier nobody knows yet is humanised
 * (`WEATHER_HOLD` → `Weather hold`). The court annotation is user-authored free text and is passed
 * through as written, never interpreted.
 */
import type { ScheduleCellConfig, ScheduleCellData } from '../types';

export type TimeModifierLabelMap = NonNullable<ScheduleCellConfig['timeModifierLabels']>;

// English defaults for consumers that do not supply a locale. Never display stored enum identifiers.
export const DEFAULT_TIME_MODIFIER_LABELS: TimeModifierLabelMap = {
  NOT_BEFORE: { label: 'Not Before', short: 'NB' },
  FOLLOWED_BY: { label: 'Followed by' },
  NEXT_AVAILABLE: { label: 'Next available' },
  AFTER_REST: { label: 'After rest' },
  TO_BE_ANNOUNCED: { label: 'To be announced', short: 'TBA' },
  RAIN_DELAY: { label: 'Rain delay' }
};

export interface ScheduleTimeLabels {
  /** One compact label per modifier, in stored order: the short form where there is one. */
  compact: string[];
  /** The clock, `scheduledTime` or else `startTime`. */
  time?: string;
  courtAnnotation?: string;
  /** Full labels, clock and note joined: the hover text and the accessible name. */
  title: string;
}

/** What a cell's time field says, or `undefined` when there is nothing to show. */
export function timeModifierLabels(
  schedule: ScheduleCellData['schedule'],
  labels?: TimeModifierLabelMap
): ScheduleTimeLabels | undefined {
  const time = schedule?.scheduledTime || schedule?.startTime;
  const modifiers = schedule?.timeModifiers ?? [];
  const courtAnnotation = schedule?.courtAnnotation;
  if (!time && !modifiers.length && !courtAnnotation) return undefined;

  const resolved = modifiers.map((modifier) => {
    const fallback = modifier.replaceAll('_', ' ').toLowerCase();
    return (
      labels?.[modifier] ??
      DEFAULT_TIME_MODIFIER_LABELS[modifier] ?? {
        label: fallback.charAt(0).toUpperCase() + fallback.slice(1)
      }
    );
  });
  const compact = resolved.map(({ label, short }) => short || label);
  const full = resolved.map(({ label }) => label);
  if (time) full.push(time);
  if (courtAnnotation) full.push(courtAnnotation);

  return { compact, time: time || undefined, courtAnnotation: courtAnnotation || undefined, title: full.join(' · ') };
}
