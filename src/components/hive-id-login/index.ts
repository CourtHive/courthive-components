/**
 * HiveID Login — public API.
 *
 * `buildHiveIDLogin(config)` returns a `HiveIDLoginShell` with a `root`
 * HTMLElement that the consumer mounts in their own container. The
 * shell emits a `hiveid:authenticated` CustomEvent on success.
 *
 * `completeMagicLink(cfsBaseUrl, code)` is the consume-side helper for
 * the magic-link landing route on courthive-public.
 */
import './hive-id-login.css';

export { buildHiveIDLogin, completeMagicLink } from './buildHiveIDLogin';
export {
  consumeMagicLink,
  isExistingUserConflict,
  requestMagicLink,
  signup,
  verifyExisting
} from './hiveIDClient';

export type {
  CachedPersonFields,
  HiveIDAuthenticatedDetail,
  HiveIDClientError,
  HiveIDFederationId,
  HiveIDLoginConfig,
  HiveIDLoginShell,
  HiveIDMode,
  MagicLinkConsumeRequest,
  MagicLinkConsumeResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  SignupCandidate,
  SignupRequest,
  SignupResolved,
  SignupResponse,
  VerifyExistingRequest,
  VerifyExistingResponse
} from './types';
