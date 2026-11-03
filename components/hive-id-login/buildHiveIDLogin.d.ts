import { HiveIDAuthenticatedDetail, HiveIDFederationId, HiveIDLoginConfig, HiveIDLoginShell } from './types';
export declare function buildHiveIDLogin(config: HiveIDLoginConfig): HiveIDLoginShell;
/** Magic-link consume helper for the courthive-public landing route. */
export declare function completeMagicLink(cfsBaseUrl: string, code: string, fetchImpl?: typeof fetch): Promise<HiveIDAuthenticatedDetail>;
/**
 * Merge a user-entered federation id (from the signup capture field) with any
 * consumer-supplied `config.federationIds`, de-duped by `provider::externalId`.
 * Returns undefined when there is nothing to send (so the signup fragment stays
 * name-only, matching prior behavior).
 */
export declare function mergeFederationIds(entered: HiveIDFederationId | null, configIds?: HiveIDFederationId[]): HiveIDFederationId[] | undefined;
/**
 * Normalize the raw DOB + sex captured on the signup form: trim, and drop empty
 * values (so an untouched field stays `undefined` and the signup fragment omits
 * it rather than sending an empty string). Pure — unit-tested without the DOM.
 */
export declare function normalizeSignupPii(raw: {
    birthDate?: string;
    sex?: string;
}): {
    birthDate?: string;
    sex?: string;
};
