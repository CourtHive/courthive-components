import { TimeScale } from './TimeScale';
import { RowLayout } from './RowLayout';
import { ItemRenderer } from './ItemRenderer';
import { InteractionMode, TimelineCallbacks, TimelineItemData } from './types';
export declare class InteractionManager {
    private scale;
    private layout;
    private renderer;
    private contentArea;
    private callbacks;
    private snapMinutes;
    private enablePinchZoom;
    /** Element that receives wheel events (defaults to contentArea, can be overridden) */
    private wheelTarget;
    private mode;
    private gesture;
    private items;
    /** Ghost state for multi-row creation */
    private ghostStartTime;
    private ghostEndTime;
    private ghostTopRow;
    private ghostBottomRow;
    /** Drag guard — suppresses click handler after drag */
    private justDragged;
    /** Auto-scroll RAF handle */
    private autoScrollRaf;
    private autoScrollDelta;
    /** Scroll container (the body wrapper that scrolls vertically) */
    private scrollContainer;
    constructor(scale: TimeScale, layout: RowLayout, renderer: ItemRenderer, callbacks: TimelineCallbacks, snapMinutes?: number, enablePinchZoom?: boolean);
    setItems(items: TimelineItemData[]): void;
    setScrollContainer(el: HTMLElement): void;
    /** Override the element that receives wheel events (e.g. timeline root instead of content area) */
    setWheelTarget(el: HTMLElement): void;
    /** Attach event listeners to the content area */
    attach(): void;
    /** Detach all event listeners */
    detach(): void;
    getMode(): InteractionMode;
    private onPointerDown;
    private startGesture;
    private onPointerMove;
    private handleDragMove;
    private handleResizeMove;
    private onPointerUp;
    private onDblClick;
    private handleGhostTimeResize;
    private handleGhostRowResize;
    private updateGhostDisplay;
    private confirmGhost;
    private cancelGhost;
    private onWheel;
    /** Callback set by CourtTimeline to trigger re-render when scale changes */
    onScaleChanged: (() => void) | null;
    private onKeyDown;
    private checkAutoScroll;
    private startAutoScroll;
    private stopAutoScroll;
}
