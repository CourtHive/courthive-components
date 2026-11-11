/**
 * A component's lifetime, apart from the DOM, for components that finish mounting after a dynamic import.
 * The venue locator imports Leaflet this way, so its map mounts a tick after `buildVenueLocator` returns;
 * the date fields and the availability grid import `vanillajs-datepicker` this way (`loadDatepicker.ts`).
 * A host can destroy the component inside that window. Everything here is pure so the "destroyed while
 * loading" rule is testable without the dependency or a DOM.
 */
export interface Lifetime {
    disposed: boolean;
    /** Replaced once the loaded thing exists; `dispose` runs whichever cleanup is current. */
    cleanup: () => void;
}
export declare function createLifetime(): Lifetime & {
    dispose: () => void;
};
export type LoadOutcome<T> = {
    status: 'disposed';
} | {
    status: 'loaded';
    value: T;
} | {
    status: 'failed';
    cause: unknown;
};
/**
 * Await `load`, then report `disposed` if the lifetime ended while it was pending — whether the load
 * resolved or rejected — so the caller neither mounts nor reports a failure for a component that is gone.
 */
export declare function loadUnlessDisposed<T>(lifetime: Lifetime, load: () => Promise<T>): Promise<LoadOutcome<T>>;
