import { Configuration, EventHandlers, MatchUp } from '../../types';
export declare function renderSchedule({ configuration, eventHandlers, matchUp }: {
    configuration?: Configuration;
    eventHandlers?: EventHandlers;
    matchUp?: MatchUp;
}): HTMLElement;
/**
 * The schedule header's date and time, compact enough not to wrap beside a court name: `Mon 26 Oct., 8:00AM`.
 * The month is abbreviated with a period when it is shortened (`May` stays as it is), and the hour drops the
 * leading zero and the space before AM/PM (CA, 2026-10-26: `07:30 AM` wrapped the header).
 */
export declare function formatScheduleDate(date: string, time?: string): string;
