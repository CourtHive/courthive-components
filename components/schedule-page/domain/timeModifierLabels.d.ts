import { ScheduleCellConfig, ScheduleCellData } from '../types';
export type TimeModifierLabelMap = NonNullable<ScheduleCellConfig['timeModifierLabels']>;
export declare const DEFAULT_TIME_MODIFIER_LABELS: TimeModifierLabelMap;
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
export declare function timeModifierLabels(schedule: ScheduleCellData['schedule'], labels?: TimeModifierLabelMap): ScheduleTimeLabels | undefined;
