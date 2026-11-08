import { AcceptanceEntry, EntryChange, TopologyState } from '../types';
export interface AcceptanceOptions {
    pool: () => AcceptanceEntry[];
    held: () => AcceptanceEntry[];
    cut: (state: TopologyState) => number;
    changes: (state: TopologyState) => EntryChange[];
    setCut: (cut: number) => void;
    discard: () => void;
}
export declare function buildAcceptancePanel(options: AcceptanceOptions): {
    element: HTMLElement;
    update: (state: TopologyState) => void;
};
