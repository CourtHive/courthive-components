import { ProfileStoreState, UIPanel } from '../types';
export interface DateStripCallbacks {
    onDateSelected: (date: string) => void;
}
export declare function buildDateStrip(callbacks: DateStripCallbacks): UIPanel<ProfileStoreState>;
