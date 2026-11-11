/**
 * The locator's lifetime, apart from the DOM. Leaflet is imported dynamically, so the map mounts a
 * tick after `buildVenueLocator` returns; a host can destroy the locator inside that window. Everything
 * here is pure so the "destroyed while loading" rule is testable without Leaflet or a DOM.
 */

export interface LocatorLifetime {
  disposed: boolean;
  /** Replaced once the map exists; `dispose` runs whichever cleanup is current. */
  cleanup: () => void;
}

export function createLocatorLifetime(): LocatorLifetime & { dispose: () => void } {
  const lifetime = {
    disposed: false,
    cleanup: () => {},
    dispose: () => {
      lifetime.disposed = true;
      lifetime.cleanup();
    }
  };
  return lifetime;
}

export type LoadOutcome<T> =
  { status: 'disposed' } | { status: 'loaded'; value: T } | { status: 'failed'; cause: unknown };

/**
 * Await `load`, then report `disposed` if the lifetime ended while it was pending — whether the load
 * resolved or rejected — so the caller neither mounts nor reports a failure for a locator that is gone.
 */
export async function loadUnlessDisposed<T>(
  lifetime: LocatorLifetime,
  load: () => Promise<T>
): Promise<LoadOutcome<T>> {
  try {
    const value = await load();
    return lifetime.disposed ? { status: 'disposed' } : { status: 'loaded', value };
  } catch (cause) {
    return lifetime.disposed ? { status: 'disposed' } : { status: 'failed', cause };
  }
}
