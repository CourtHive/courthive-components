import { InspectorGeometry } from '../types';
export declare function clampInspectorGeometry(value: Partial<InspectorGeometry>, width: number, height: number): InspectorGeometry;
/**
 * Where a panel with no remembered place opens: inside its host's area (a page whose own chrome sits lower than the
 * window's top), at the area's top right, no taller than the area. Without an area, the window's default.
 */
export declare function anchoredInspectorGeometry(size: Partial<InspectorGeometry>, area: {
    top: number;
    right: number;
    bottom: number;
} | undefined, width: number, height: number): InspectorGeometry;
interface FloatingInspectorOptions {
    geometry?: InspectorGeometry;
    /** The size a panel with no remembered geometry opens at. */
    size?: Partial<InspectorGeometry>;
    /**
     * The area a panel with no remembered geometry opens in, asked when it is first shown (and on Reset position): the
     * topology builder's canvas, so a panel never opens over the builder's own toolbar.
     */
    anchor?: () => {
        top: number;
        right: number;
        bottom: number;
    } | undefined;
    onGeometryChange?: (geometry: InspectorGeometry) => void;
    onClose: () => void;
    /** Without it there is no Dock button: a panel with nowhere to dock, such as the topology's acceptance lines. */
    onDock?: () => void;
    /** The header's text and the dialog's accessible name; the topology builder floats its properties pane too. */
    title?: string;
    label?: string;
}
/** A non-modal host. The caller owns selection, content, visibility and persistence. */
export declare function buildFloatingInspector(panel: HTMLElement, options: FloatingInspectorOptions): {
    element: HTMLElement;
    content: HTMLDivElement;
    setVisible: (visible: boolean) => void;
    rememberFocus: () => void;
    destroy: () => void;
};
export {};
