import { InspectorGeometry } from '../types';
export declare function clampInspectorGeometry(value: Partial<InspectorGeometry>, width: number, height: number): InspectorGeometry;
interface FloatingInspectorOptions {
    geometry?: InspectorGeometry;
    onGeometryChange?: (geometry: InspectorGeometry) => void;
    onClose: () => void;
    onDock: () => void;
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
