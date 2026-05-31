/**
 * HiveID Login — types.
 *
 * Mirrors the response shapes from CFS `/auth/hiveid/*` (PR-G):
 * - POST /auth/hiveid/signup
 * - POST /auth/hiveid/verify-existing
 * - POST /auth/hiveid/magic-link
 * - POST /auth/hiveid/magic-link/consume
 */

export type HiveIDMode = 'signup' | 'login' | 'magic-link';

export interface CachedPersonFields {
  standardFamilyName: string | null;
  standardGivenName: string | null;
  birthDate: string | null;
  sex: string | null;
  nationalityCode: string | null;
}

export interface HiveIDFederationId {
  provider: string;
  externalId: string;
}

export interface HiveIDAuthenticatedDetail {
  token: string;
  refreshToken: string;
  personId: string | null;
  cached: CachedPersonFields;
}

export interface SignupRequest {
  email: string;
  firstName: string;
  lastName: string;
  federationIds?: HiveIDFederationId[];
}

export interface VerifyExistingRequest {
  email: string;
  password: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkConsumeRequest {
  code: string;
}

export interface SignupResolved {
  status: 'created';
  token: string;
  refreshToken: string;
  personId: string;
  personRevision: number;
  cached: CachedPersonFields;
}

export interface SignupCandidate {
  status: 'candidate';
  candidates: { personId: string; confidence: number }[];
}

export type SignupResponse = SignupResolved | SignupCandidate;

export interface VerifyExistingResponse {
  status: 'verified';
  token: string;
  refreshToken: string;
  personId: string | null;
  personRevision: number | null;
  cached: CachedPersonFields | null;
}

export interface MagicLinkResponse {
  ok: true;
}

export interface MagicLinkConsumeResponse {
  status: 'authenticated';
  token: string;
  refreshToken: string;
  personId: string | null;
  personRevision: number | null;
  cached: CachedPersonFields;
}

export interface HiveIDLoginConfig {
  /** Which CFS instance to talk to (no trailing slash). */
  cfsBaseUrl: string;
  /** Starting mode. Defaults to 'signup'. The user can toggle inside the component. */
  mode?: HiveIDMode;
  /** Pre-fill email — useful when the consumer already knows the user. */
  defaultEmail?: string;
  /**
   * Optional pre-existing federation IDs (e.g. a USTA id known to the
   * consumer) appended to the signup resolve fragment to bump
   * strong-match likelihood. Most callers leave this empty.
   */
  federationIds?: HiveIDFederationId[];
  /** Optional fetch implementation (tests stub this). */
  fetchImpl?: typeof fetch;
}

export interface HiveIDLoginShell {
  /** Root DOM node — append to your container. */
  root: HTMLElement;
  /** Programmatically swap modes (signup ⇄ login ⇄ magic-link). */
  setMode(mode: HiveIDMode): void;
  /** Current mode. */
  getMode(): HiveIDMode;
  /** Convenience: subscribe to the success event without addEventListener. */
  onAuthenticated(handler: (detail: HiveIDAuthenticatedDetail) => void): () => void;
}

export type HiveIDClientError =
  | { kind: 'http'; status: number; body: any }
  | { kind: 'network'; cause: Error }
  | { kind: 'parse'; cause: Error };
