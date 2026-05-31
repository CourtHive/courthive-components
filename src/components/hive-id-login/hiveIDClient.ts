/**
 * HiveID client — vendor-blind fetch wrappers over the four
 * `/auth/hiveid/*` endpoints landed in CFS PR-G.
 *
 * Pure functions: no DOM access, no globals beyond `fetch` (which can
 * be injected via the `fetchImpl` arg for tests). Designed to be unit-
 * testable without happy-dom (per the ecosystem feedback memory
 * `feedback_one_dom_test_layer_per_ecosystem`).
 */
import type {
  HiveIDClientError,
  MagicLinkConsumeRequest,
  MagicLinkConsumeResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  SignupRequest,
  SignupResponse,
  VerifyExistingRequest,
  VerifyExistingResponse
} from './types';

type FetchLike = typeof fetch;

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

async function postJson<TReq, TResp>(
  baseUrl: string,
  path: string,
  body: TReq,
  fetchImpl: FetchLike = fetch
): Promise<TResp> {
  const url = trimTrailingSlash(baseUrl) + path;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    const error: HiveIDClientError = { kind: 'network', cause: err as Error };
    throw error;
  }
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch (err) {
    if (res.ok) {
      const error: HiveIDClientError = { kind: 'parse', cause: err as Error };
      throw error;
    }
  }
  if (!res.ok) {
    const error: HiveIDClientError = { kind: 'http', status: res.status, body: parsed };
    throw error;
  }
  return parsed as TResp;
}

export function signup(
  baseUrl: string,
  body: SignupRequest,
  fetchImpl?: FetchLike
): Promise<SignupResponse> {
  return postJson(baseUrl, '/auth/hiveid/signup', body, fetchImpl);
}

export function verifyExisting(
  baseUrl: string,
  body: VerifyExistingRequest,
  fetchImpl?: FetchLike
): Promise<VerifyExistingResponse> {
  return postJson(baseUrl, '/auth/hiveid/verify-existing', body, fetchImpl);
}

export function requestMagicLink(
  baseUrl: string,
  body: MagicLinkRequest,
  fetchImpl?: FetchLike
): Promise<MagicLinkResponse> {
  return postJson(baseUrl, '/auth/hiveid/magic-link', body, fetchImpl);
}

export function consumeMagicLink(
  baseUrl: string,
  body: MagicLinkConsumeRequest,
  fetchImpl?: FetchLike
): Promise<MagicLinkConsumeResponse> {
  return postJson(baseUrl, '/auth/hiveid/magic-link/consume', body, fetchImpl);
}

/**
 * Helper: returns true when the error is a 409 with the existing-user
 * redirect shape from CFS (`{ code: 'EXISTING_USER', ... }`). The
 * component uses this to swap signup mode → verify-existing without
 * re-typing the email.
 */
export function isExistingUserConflict(err: unknown): err is HiveIDClientError {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;
  if (e.kind !== 'http' || e.status !== 409) return false;
  return e.body?.code === 'EXISTING_USER';
}
