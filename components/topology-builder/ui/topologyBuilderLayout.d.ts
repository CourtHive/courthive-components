import { TopologyState, UIPanel } from '../types';
import { FooterPanel } from './footer';
export declare function buildTopologyBuilderLayout({ toolbar, canvas, nodeEditor, edgeEditor, footer }: {
    toolbar: UIPanel<TopologyState>;
    canvas: UIPanel<TopologyState>;
    nodeEditor: UIPanel<TopologyState>;
    edgeEditor: UIPanel<TopologyState>;
    /** The strip beneath the canvas, when the host asks for one. */
    footer?: FooterPanel;
}): UIPanel<TopologyState>;
