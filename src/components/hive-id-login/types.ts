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
  /** Date of birth (YYYY-MM-DD), collected behind a consent gate. */
  birthDate?: string;
  /** Sex ('M' | 'F'), collected behind a consent gate. */
  sex?: string;
  /** Provider context — anchors a fresh mint to the registering tournament's tenant. */
  provider?: string;
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

export interface FederationIdCaptureProvider {
  /** Provider key sent to the registry, e.g. 'BOBOCA'. */
  value: string;
  /** Display label, e.g. 'BOBOCA'. */
  label: string;
}

/**
 * Opt-in federation-id capture on the signup form. When present, the signup
 * form shows an optional "player id" field (+ a provider select when more than
 * one provider is offered). A person who quotes an id that matches a
 * `(provider, externalId)` alias in courthive-persons is strong-match RESOLVED
 * at signup — the only way the name-only signup fragment can acquire a
 * `personId` today. This is the "claim your existing (e.g. BOBOCA) identity" path.
 */
export interface FederationIdCaptureConfig {
  /** One or more providers to offer. A single entry renders no select (fixed provider). */
  providers: FederationIdCaptureProvider[];
  /** Label for the id input. Default: 'Player ID'. */
  idLabel?: string;
  /** Optional helper text shown above the field. */
  note?: string;
}

export interface SignupSexOption {
  /** Value sent verbatim to courthive-persons — 'M' / 'F' (the backfill encoding). */
  value: string;
  /** Display label, e.g. 'Male'. */
  label: string;
}

/**
 * Opt-in date-of-birth + sex capture on the signup form. When present (and the
 * consumer has already gated collection behind a consent notice — decision #4 of
 * PUBLIC_REGISTRATION_AND_ONBOARDING), the signup form shows a DOB field and a sex
 * select. Together with a `provider` context these let courthive-persons dedupe on
 * name+DOB+sex, or MINT a canonical person when no match exists (the only path a
 * brand-new public person can acquire a personId without a pre-existing provider id).
 */
export interface DobSexCaptureConfig {
  /** Sex options offered. Defaults to Male→'M' / Female→'F' (persons encoding). */
  sexOptions?: SignupSexOption[];
  /** Label for the DOB input. Default: 'Date of birth'. */
  dobLabel?: string;
  /** Label for the sex select. Default: 'Sex'. */
  sexLabel?: string;
  /** Optional helper text shown above the fields. */
  note?: string;
  /** Require both DOB and sex before signup can proceed. Default: true. */
  required?: boolean;
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
  /**
   * Opt-in: show an optional federation-id field on the signup form so a person
   * can quote an existing provider id and be RESOLVED to their canonical
   * person. Merged with `federationIds`. See FederationIdCaptureConfig.
   */
  federationIdCapture?: FederationIdCaptureConfig;
  /**
   * Opt-in: show DOB + sex fields on the signup form so a brand-new person can be
   * deduped-or-MINTED. The consumer is responsible for the consent gate that must
   * precede collection (decision #4). See DobSexCaptureConfig.
   */
  dobSexCapture?: DobSexCaptureConfig;
  /**
   * Provider context forwarded on signup (e.g. the registering tournament's
   * provider). Anchors a fresh mint to that tenant. Paired with `dobSexCapture`.
   */
  provider?: string;
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
