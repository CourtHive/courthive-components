import { describe, expect, it, vi } from 'vitest';

import {
  consumeMagicLink,
  isExistingUserConflict,
  requestMagicLink,
  signup,
  verifyExisting
} from '../hiveIDClient';

const BASE = 'https://courthive.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('hiveIDClient', () => {
  describe('signup', () => {
    it('POSTs to /auth/hiveid/signup with JSON body and returns the parsed response', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({
          status: 'created',
          token: 't',
          refreshToken: 'rt',
          personId: 'p-1',
          personRevision: 1,
          cached: {
            standardFamilyName: 'Doe',
            standardGivenName: 'Jane',
            birthDate: null,
            sex: null,
            nationalityCode: null
          }
        })
      );
      const resp = await signup(
        BASE,
        { email: 'jane@test.com', firstName: 'Jane', lastName: 'Doe' },
        fetchImpl as any
      );
      expect(resp).toMatchObject({ status: 'created', personId: 'p-1' });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe('https://courthive.test/auth/hiveid/signup');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(init.body)).toEqual({
        email: 'jane@test.com',
        firstName: 'Jane',
        lastName: 'Doe'
      });
    });

    it('trims trailing slashes on baseUrl', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'candidate', candidates: [] }));
      await signup(
        `${BASE}//`,
        { email: 'a@b.c', firstName: 'A', lastName: 'B' },
        fetchImpl as any
      );
      expect(fetchImpl.mock.calls[0][0]).toBe('https://courthive.test/auth/hiveid/signup');
    });

    it('throws an HTTP error on non-2xx with parsed body', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({ code: 'EXISTING_USER', message: 'already exists' }, 409)
      );
      await expect(
        signup(BASE, { email: 'a@b.c', firstName: 'A', lastName: 'B' }, fetchImpl as any)
      ).rejects.toMatchObject({
        kind: 'http',
        status: 409,
        body: { code: 'EXISTING_USER', message: 'already exists' }
      });
    });

    it('wraps fetch failures as network errors', async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
      await expect(
        signup(BASE, { email: 'a@b.c', firstName: 'A', lastName: 'B' }, fetchImpl as any)
      ).rejects.toMatchObject({ kind: 'network' });
    });
  });

  describe('verifyExisting', () => {
    it('POSTs to /auth/hiveid/verify-existing', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({
          status: 'verified',
          token: 't',
          refreshToken: 'rt',
          personId: 'p-1',
          personRevision: 2,
          cached: null
        })
      );
      const resp = await verifyExisting(
        BASE,
        { email: 'admin@test.com', password: 'pw' },
        fetchImpl as any
      );
      expect(resp.status).toBe('verified');
      expect(fetchImpl.mock.calls[0][0]).toBe('https://courthive.test/auth/hiveid/verify-existing');
    });

    it('surfaces 401 with parsed body', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'Invalid credentials' }, 401));
      await expect(
        verifyExisting(BASE, { email: 'admin@test.com', password: 'nope' }, fetchImpl as any)
      ).rejects.toMatchObject({ kind: 'http', status: 401 });
    });
  });

  describe('requestMagicLink', () => {
    it('POSTs to /auth/hiveid/magic-link and returns { ok: true }', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const resp = await requestMagicLink(BASE, { email: 'x@y.z' }, fetchImpl as any);
      expect(resp).toEqual({ ok: true });
      expect(fetchImpl.mock.calls[0][0]).toBe('https://courthive.test/auth/hiveid/magic-link');
    });
  });

  describe('consumeMagicLink', () => {
    it('POSTs to /auth/hiveid/magic-link/consume with the code', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({
          status: 'authenticated',
          token: 't',
          refreshToken: 'rt',
          personId: 'p-1',
          personRevision: 1,
          cached: {
            standardFamilyName: null,
            standardGivenName: null,
            birthDate: null,
            sex: null,
            nationalityCode: null
          }
        })
      );
      const resp = await consumeMagicLink(BASE, { code: 'hmlk_abc' }, fetchImpl as any);
      expect(resp.status).toBe('authenticated');
      expect(fetchImpl.mock.calls[0][0]).toBe('https://courthive.test/auth/hiveid/magic-link/consume');
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ code: 'hmlk_abc' });
    });
  });

  describe('isExistingUserConflict', () => {
    it('returns true on 409 + EXISTING_USER body', () => {
      expect(
        isExistingUserConflict({ kind: 'http', status: 409, body: { code: 'EXISTING_USER' } })
      ).toBe(true);
    });

    it('returns false on other 409 bodies', () => {
      expect(
        isExistingUserConflict({ kind: 'http', status: 409, body: { code: 'OTHER' } })
      ).toBe(false);
    });

    it('returns false on non-409 HTTP errors', () => {
      expect(
        isExistingUserConflict({ kind: 'http', status: 422, body: { code: 'EXISTING_USER' } })
      ).toBe(false);
    });

    it('returns false for non-error shapes', () => {
      expect(isExistingUserConflict(undefined)).toBe(false);
      expect(isExistingUserConflict({ kind: 'network', cause: new Error('x') })).toBe(false);
      expect(isExistingUserConflict('not-an-error')).toBe(false);
    });
  });
});
