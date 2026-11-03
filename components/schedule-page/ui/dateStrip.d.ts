import { SchedulePageState, UIPanel } from '../types';
export interface DateStripCallbacks {
    onDateSelected: (date: string) => void;
}
export declare function buildScheduleDateStrip(callbacks: DateStripCallbacks): UIPanel<SchedulePageState>;
