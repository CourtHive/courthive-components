import { ScheduleCellConfig, ScheduleCellData } from '../types';
export declare const DEFAULT_SCHEDULE_CELL_CONFIG: ScheduleCellConfig;
export declare function buildScheduleGridCell(data: ScheduleCellData, config?: ScheduleCellConfig): HTMLElement;
/**
 * Maps a factory hydrated matchUp object to the flat ScheduleCellData shape.
 * Handles sides[].participant.participantName nesting, schedule.* extraction, etc.
 */
export declare function mapMatchUpToCellData(matchUp: any): ScheduleCellData;
