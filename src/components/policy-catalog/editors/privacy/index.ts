/**
 * Participant Privacy Editor — Public API
 */

export { PrivacyEditorControl, createPrivacyEditor } from './privacyEditorControl';
export { PrivacyEditorStore } from './privacyEditorStore';
export { buildPrivacyEditorPanel } from './privacyEditorPanel';
export {
  emptyPrivacyPolicy,
  privacyFields,
  readField,
  writeField,
  readPolicyName,
  writePolicyName,
} from './domain/privacyProjections';

export type { PrivacyPolicyData, PrivacyEditorState, PrivacyEditorChangeListener, PrivacyEditorConfig } from './types';
export type { PrivacyFieldMeta } from './domain/privacyProjections';
