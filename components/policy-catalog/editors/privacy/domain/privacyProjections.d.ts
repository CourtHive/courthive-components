import { PrivacyPolicyData } from '../types';
export interface PrivacyFieldMeta {
    field: string;
    group: 'participant' | 'person';
    /** Humanised label, e.g. birthDate → "Birth date". */
    label: string;
}
/**
 * A complete privacy policy in the catalog's INNER shape (no `[policyType]`
 * wrapper) — matching how `safePolicyData` unwraps fixtures for every editor:
 * `{ policyName, participant: { ...attributeFilter } }`.
 */
export declare function emptyPrivacyPolicy(): PrivacyPolicyData;
/** All toggleable attributes (flags and shapes) from the template — participant-level, then person. */
export declare function privacyFields(template?: PrivacyPolicyData): PrivacyFieldMeta[];
/** Published when the attribute is `true` or carries a shape; stripped when `false` or absent. */
export declare function readField(policy: PrivacyPolicyData, group: 'participant' | 'person', field: string): boolean;
/**
 * Set an attribute on both the direct participant/person and the doubles/team
 * `individualParticipants` branch, so singles and pair members stay consistent.
 *
 * On writes each level's TEMPLATE value: a shape stays a shape. An attribute the
 * policy lacks but the template names is written too, so a policy saved before the
 * factory added it (`teams`, 2026-10) can still be switched on.
 */
export declare function writeField(policy: PrivacyPolicyData, group: 'participant' | 'person', field: string, value: boolean, template?: PrivacyPolicyData): void;
/**
 * Fill every attribute the template names but the policy lacks with the template's default, at each level.
 *
 * A saved policy carries only the attributes that existed when it was saved. Without this, `teams` (added to the
 * factory default 2026-10) would read as stripped in every older policy, though nobody had ever been offered it.
 * Attributes the policy does carry are never changed.
 */
export declare function normalisePrivacyPolicy(policy: PrivacyPolicyData, template?: PrivacyPolicyData): PrivacyPolicyData;
export declare function readPolicyName(policy: PrivacyPolicyData): string;
export declare function writePolicyName(policy: PrivacyPolicyData, value: string): void;
