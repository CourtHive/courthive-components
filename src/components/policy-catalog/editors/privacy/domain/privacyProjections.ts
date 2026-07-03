/**
 * Privacy editor domain — template-derived field enumeration + accessors.
 *
 * The field set and defaults come from the LIVE factory template
 * (`fixtures.policies.POLICY_PRIVACY_DEFAULT`), so the editor stays complete if
 * a newer factory schema adds privacy attributes — nothing is hardcoded.
 */
import { fixtures, factoryConstants } from 'tods-competition-factory';

import type { PrivacyPolicyData } from '../types';

const POLICY_TYPE_PARTICIPANT = factoryConstants.policyConstants.POLICY_TYPE_PARTICIPANT;

export interface PrivacyFieldMeta {
  field: string;
  group: 'participant' | 'person';
  /** Humanised label, e.g. birthDate → "Birth date". */
  label: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * A complete privacy policy in the catalog's INNER shape (no `[policyType]`
 * wrapper) — matching how `safePolicyData` unwraps fixtures for every editor:
 * `{ policyName, participant: { ...attributeFilter } }`.
 */
export function emptyPrivacyPolicy(): PrivacyPolicyData {
  return clone(fixtures.policies.POLICY_PRIVACY_DEFAULT[POLICY_TYPE_PARTICIPANT]);
}

function root(policy: PrivacyPolicyData): any {
  return policy?.participant ?? {};
}

function humanise(field: string): string {
  const spaced = field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** All boolean attributes from the template — participant-level, then person. */
export function privacyFields(): PrivacyFieldMeta[] {
  const r = root(emptyPrivacyPolicy());
  const participant: PrivacyFieldMeta[] = Object.keys(r)
    .filter((k) => typeof r[k] === 'boolean')
    .map((field) => ({ field, group: 'participant', label: humanise(field) }));
  const person: PrivacyFieldMeta[] = Object.keys(r.person ?? {})
    .filter((k) => typeof r.person[k] === 'boolean')
    .map((field) => ({ field, group: 'person', label: humanise(field) }));
  return [...participant, ...person];
}

export function readField(policy: PrivacyPolicyData, group: 'participant' | 'person', field: string): boolean {
  const r = root(policy);
  return group === 'person' ? !!r.person?.[field] : !!r[field];
}

/**
 * Set an attribute on both the direct participant/person and the doubles/team
 * `individualParticipants` branch, so singles and pair members stay consistent.
 */
export function writeField(
  policy: PrivacyPolicyData,
  group: 'participant' | 'person',
  field: string,
  value: boolean,
): void {
  const r = root(policy);
  const setBoth = (primary: any, mirror: any) => {
    if (primary && field in primary) primary[field] = value;
    if (mirror && field in mirror) mirror[field] = value;
  };
  if (group === 'person') setBoth(r.person, r.individualParticipants?.person);
  else setBoth(r, r.individualParticipants);
}

export function readPolicyName(policy: PrivacyPolicyData): string {
  return policy?.policyName ?? '';
}

export function writePolicyName(policy: PrivacyPolicyData, value: string): void {
  if (policy) policy.policyName = value;
}
