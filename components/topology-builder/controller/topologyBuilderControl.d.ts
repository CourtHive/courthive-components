import { TopologyState, TopologyBuilderConfig } from '../types';
export declare class TopologyBuilderControl {
    private readonly store;
    private readonly layout;
    private readonly unsubscribe;
    private readonly config;
    constructor(config?: TopologyBuilderConfig);
    private buildToolbarPanel;
    private buildCanvasPanel;
    private handleCreateEdge;
    render(container: HTMLElement): void;
    destroy(): void;
    autoLayout(): void;
    getState(): TopologyState;
    loadState(state: TopologyState): void;
    private addDefaultStructure;
    private scrollCanvasToNode;
    private handleGenerate;
}
