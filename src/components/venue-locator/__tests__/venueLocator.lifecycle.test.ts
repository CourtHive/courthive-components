import { createLocatorLifetime, loadUnlessDisposed } from '../lifetime';
import { describe, expect, it, vi } from 'vitest';

/**
 * Leaflet is imported dynamically, so a locator can be destroyed while the import is pending. The guard
 * that keeps a destroyed locator from mounting (or reporting "map unavailable") is `loadUnlessDisposed`.
 * The wiring — a real `buildVenueLocator` destroyed before Leaflet resolves, beside a control that does
 * mount — is asserted in Chromium by `src/stories/VenueLocatorLifecycleTests.stories.ts`.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('venue locator lifetime', () => {
  it('reports disposed when destroyed while the load is pending, even though the load succeeds', async () => {
    const lifetime = createLocatorLifetime();
    const load = deferred<string>();
    const outcome = loadUnlessDisposed(lifetime, () => load.promise);
    lifetime.dispose();
    load.resolve('leaflet');
    await expect(outcome).resolves.toEqual({ status: 'disposed' });
  });

  it('reports disposed, not failed, when destroyed while a load that then fails is pending', async () => {
    const lifetime = createLocatorLifetime();
    const load = deferred<string>();
    const outcome = loadUnlessDisposed(lifetime, () => load.promise);
    lifetime.dispose();
    load.reject(new Error('not installed'));
    await expect(outcome).resolves.toEqual({ status: 'disposed' });
  });

  it('CONTROL: a live lifetime gets the loaded value or the failure cause', async () => {
    const cause = new Error('not installed');
    await expect(loadUnlessDisposed(createLocatorLifetime(), async () => 'leaflet')).resolves.toEqual({
      status: 'loaded',
      value: 'leaflet'
    });
    await expect(
      loadUnlessDisposed(createLocatorLifetime(), async () => {
        throw cause;
      })
    ).resolves.toEqual({ status: 'failed', cause });
  });

  it('dispose runs the cleanup installed after creation, the one a mounted map replaces', () => {
    const lifetime = createLocatorLifetime();
    const removeMap = vi.fn();
    lifetime.cleanup = removeMap;
    lifetime.dispose();
    expect(lifetime.disposed).toBe(true);
    expect(removeMap).toHaveBeenCalledTimes(1);
  });
});
