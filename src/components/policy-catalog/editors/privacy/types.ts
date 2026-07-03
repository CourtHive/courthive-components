/**
 * Participant Privacy Policy Editor — Type Definitions
 *
 * Edits a factory `POLICY_TYPE_PARTICIPANT` attribute-filter policy (see
 * factory/src/fixtures/policies/POLICY_PRIVACY_DEFAULT.ts): each attribute is
 * `true` (published to public payloads) or `false` (stripped). policyData is the
 * full factory policy shape so it can be attached to a tournamentRecord and
 * consumed by the factory directly.
 */

// Full factory policy shape: { participant: { policyName, participant: {...} } }.
export type PrivacyPolicyData = Record<string, any>;

export interface PrivacyEditorState {
  draft: PrivacyPolicyData;
  dirty: boolean;
}

export type PrivacyEditorChangeListener = (state: PrivacyEditorState) => void;

export interface PrivacyEditorConfig {
  initialPolicy?: PrivacyPolicyData;
  onChange?: (policy: PrivacyPolicyData) => void;
}
