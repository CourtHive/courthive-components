import { Configuration, MatchUp, ScheduleInfoOptions } from '../../types';
/** `configuration.scheduleInfo` in its object form; `true` (or nothing) is the plain header. */
export declare function scheduleInfoOptions(configuration?: Configuration): ScheduleInfoOptions;
/** The side's colour from `configuration.sideColors`, or undefined. */
export declare function sideColorOf(configuration: Configuration | undefined, matchUp: MatchUp, sideNumber: number): string;
export declare function isFinished(matchUp?: MatchUp): boolean;
/** The side due to serve, while the matchUp is unfinished; undefined when nobody is tracking service. */
export declare function servingSideOf(matchUp?: MatchUp): 1 | 2 | undefined;
/**
 * Playing time in milliseconds, or undefined before the matchUp starts. The factory's `schedule.milliseconds`
 * first (it excludes suspensions); otherwise `startTime` to `endTime`, or to `now` while the matchUp is unfinished.
 */
export declare function elapsedOf(matchUp?: MatchUp, now?: number): number | undefined;
/** `h:mm`: `0:16`, `1:42`, `12:05`. */
export declare function formatElapsed(milliseconds: number): string;
/** `Men's Singles - R32`, from what the matchUp carries; empty when it carries neither. */
export declare function eventRoundLabel(matchUp?: MatchUp): string;
