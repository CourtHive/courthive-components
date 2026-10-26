import { factoryConstants } from 'tods-competition-factory';

// constants and types
import type { Configuration, MatchUp, ScheduleInfoOptions } from '../../types';

// `: string[]` — the factory's constant arrays are `as const`, which narrows `.includes()` on a plain string
const completedMatchUpStatuses: string[] = factoryConstants.completedMatchUpStatuses;
const MINUTE = 60_000;

/** `configuration.scheduleInfo` in its object form; `true` (or nothing) is the plain header. */
export function scheduleInfoOptions(configuration?: Configuration): ScheduleInfoOptions {
  const scheduleInfo = configuration?.scheduleInfo;
  return scheduleInfo && typeof scheduleInfo === 'object' ? scheduleInfo : {};
}

/** The side's colour from `configuration.sideColors`, or undefined. */
export function sideColorOf(configuration: Configuration | undefined, matchUp: MatchUp, sideNumber: number) {
  const sideColors = configuration?.sideColors;
  if (!sideColors || (sideNumber !== 1 && sideNumber !== 2)) return undefined;
  const color = typeof sideColors === 'function' ? sideColors({ matchUp, sideNumber }) : sideColors[sideNumber];
  return typeof color === 'string' && color.trim() ? color : undefined;
}

export function isFinished(matchUp?: MatchUp): boolean {
  return Boolean(
    matchUp?.winningSide || (matchUp?.matchUpStatus && completedMatchUpStatuses.includes(matchUp.matchUpStatus))
  );
}

/** The side due to serve, while the matchUp is unfinished; undefined when nobody is tracking service. */
export function servingSideOf(matchUp?: MatchUp): 1 | 2 | undefined {
  const side = matchUp?.serverSideNumber;
  return (side === 1 || side === 2) && !isFinished(matchUp) ? side : undefined;
}

/** A time item as an instant: a full date-time as given, a bare `HH:MM` on the scheduled date. */
function instant(value: string | undefined, scheduledDate?: string): number | undefined {
  if (!value) return undefined;
  const bareTime = /^\d{1,2}:\d{2}(:\d{2})?$/.test(value);
  const parsed = Date.parse(bareTime ? (scheduledDate ? `${scheduledDate.slice(0, 10)}T${value}` : '') : value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Playing time in milliseconds, or undefined before the matchUp starts. The factory's `schedule.milliseconds`
 * first (it excludes suspensions); otherwise `startTime` to `endTime`, or to `now` while the matchUp is unfinished.
 */
export function elapsedOf(matchUp?: MatchUp, now: number = Date.now()): number | undefined {
  const schedule = matchUp?.schedule;
  if (typeof schedule?.milliseconds === 'number' && schedule.milliseconds >= 0) return schedule.milliseconds;
  const start = instant(schedule?.startTime, schedule?.scheduledDate);
  if (start === undefined) return undefined;
  const end = instant(schedule?.endTime, schedule?.scheduledDate) ?? (isFinished(matchUp) ? undefined : now);
  return end !== undefined && end >= start ? end - start : undefined;
}

/** `h:mm`: `0:16`, `1:42`, `12:05`. */
export function formatElapsed(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / MINUTE);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** `Men's Singles - R32`, from what the matchUp carries; empty when it carries neither. */
export function eventRoundLabel(matchUp?: MatchUp): string {
  return [matchUp?.eventName, matchUp?.roundName].filter(Boolean).join(' - ');
}
