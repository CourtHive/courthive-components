import { AvailabilityEngine } from 'tods-competition-factory';
export interface BlockPopoverOptions {
    itemId: string;
    blockTypes: Array<{
        type: string;
        color: string;
        label: string;
    }>;
    currentType?: string;
    startTime?: string;
    endTime?: string;
    onTypeSelected: (type: string) => void;
    onAdjustTime?: (startTime: string, endTime: string) => void;
    onDelete?: () => void;
}
export interface EngineBlockPopoverOptions {
    itemId: string;
    blockId: string;
    engine: AvailabilityEngine;
    day: string;
    onBlockChanged: () => void;
    /**
     * Optional callback rendered as a "Manage Registrations" menu item for
     * PRACTICE blocks. Provides the resolved block descriptor (courtId, date,
     * sub-window times) so the consumer can resolve to its bookingId without
     * a round trip — the factory derives bookingId from `${courtId}-${date}-${startTime}`
     * when the booking lacks an explicit one.
     */
    onManageRegistrations?: (args: {
        blockId: string;
        courtId: string;
        venueId: string;
        date: string;
        startTime: string;
        endTime: string;
    }) => void;
}
export interface BlockPopoverManager {
    show(target: HTMLElement, options: BlockPopoverOptions): void;
    showForEngineBlock(target: HTMLElement, options: EngineBlockPopoverOptions): void;
    destroy(): void;
    isActiveFor(itemId: string): boolean;
}
export declare function createBlockPopoverManager(): BlockPopoverManager;
