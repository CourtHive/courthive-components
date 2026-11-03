export interface SegmentDef {
    key: string;
    label: string;
    color: string;
}
export interface BuildSegmentedBarOptions {
    segments: SegmentDef[];
    onSegmentClick?: (key: string) => void;
}
export interface BuildSegmentedBarResult {
    element: HTMLElement;
    update: (counts: Record<string, number>) => void;
    setActive: (key: string | null) => void;
}
export declare function buildSegmentedBar(options: BuildSegmentedBarOptions): BuildSegmentedBarResult;
