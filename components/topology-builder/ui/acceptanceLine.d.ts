import { AcceptanceEntry, EntryChange, TopologyState } from '../types';
export interface AcceptanceOptions {
    stage?: string;
    below?: () => string;
    visible?: (state: TopologyState) => boolean;
    pool: () => AcceptanceEntry[];
    held: () => AcceptanceEntry[];
    cut: (state: TopologyState) => number;
    changes: (state: TopologyState) => EntryChange[];
    summary?: (state: TopologyState) => EntryChange[];
    setCut: (cut: number) => void;
    discard: () => void;
}
export declare function buildAcceptancePanel(options: AcceptanceOptions): {
    element: HTMLElement;
    update: (state: TopologyState) => void;
};
