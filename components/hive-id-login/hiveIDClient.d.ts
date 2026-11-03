import { HiveIDClientError, MagicLinkConsumeRequest, MagicLinkConsumeResponse, MagicLinkRequest, MagicLinkResponse, SignupRequest, SignupResponse, VerifyExistingRequest, VerifyExistingResponse } from './types';
type FetchLike = typeof fetch;
export declare function signup(baseUrl: string, body: SignupRequest, fetchImpl?: FetchLike): Promise<SignupResponse>;
export declare function verifyExisting(baseUrl: string, body: VerifyExistingRequest, fetchImpl?: FetchLike): Promise<VerifyExistingResponse>;
export declare function requestMagicLink(baseUrl: string, body: MagicLinkRequest, fetchImpl?: FetchLike): Promise<MagicLinkResponse>;
export declare function consumeMagicLink(baseUrl: string, body: MagicLinkConsumeRequest, fetchImpl?: FetchLike): Promise<MagicLinkConsumeResponse>;
/**
 * Helper: returns true when the error is a 409 with the existing-user
 * redirect shape from CFS (`{ code: 'EXISTING_USER', ... }`). The
 * component uses this to swap signup mode → verify-existing without
 * re-typing the email.
 */
export declare function isExistingUserConflict(err: unknown): err is HiveIDClientError;
export {};
