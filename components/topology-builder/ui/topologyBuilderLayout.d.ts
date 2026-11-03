import { TopologyState, UIPanel } from '../types';
export declare function buildTopologyBuilderLayout({ toolbar, canvas, nodeEditor, edgeEditor }: {
    toolbar: UIPanel<TopologyState>;
    canvas: UIPanel<TopologyState>;
    nodeEditor: UIPanel<TopologyState>;
    edgeEditor: UIPanel<TopologyState>;
}): UIPanel<TopologyState>;
