/**
 * Privacy editor domain — template-derived field enumeration + accessors.
 *
 * The field set and defaults come from the LIVE factory template
 * (`fixtures.policies.POLICY_PRIVACY_DEFAULT`), so the editor stays complete if
 * a newer factory schema adds privacy attributes — nothing is hardcoded.
 *
 * An attribute is either a FLAG (`true` / `false`) or a SHAPE: an object template
 * the factory applies to each element of an array attribute, e.g. `teams:
 * { participantId, participantName, ... }`. Both are one publish/strip toggle:
 * on writes the template's own value (the shape, never `true`, which would
 * publish the whole element), off writes `false`.
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

/** Keys that hold nested attribute groups rather than being attributes themselves. */
const CONTAINERS = new Set(['person', 'individualParticipants']);

function isShape(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** A toggleable attribute: a flag, or a shape that is not one of the nested groups. */
function isAttribute(key: string, value: unknown): boolean {
  return typeof value === 'boolean' || (isShape(value) && !CONTAINERS.has(key));
}

/** The attribute levels of a policy: the participant, its person, and the same two for individualParticipants. */
function levels(policy: PrivacyPolicyData): { participant: any; person: any }[] {
  const r = root(policy);
  return [
    { participant: r, person: r.person },
    { participant: r.individualParticipants, person: r.individualParticipants?.person }
  ];
}

function humanise(field: string): string {
  const spaced = field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** All toggleable attributes (flags and shapes) from the template — participant-level, then person. */
export function privacyFields(template: PrivacyPolicyData = emptyPrivacyPolicy()): PrivacyFieldMeta[] {
  const r = root(template);
  const participant: PrivacyFieldMeta[] = Object.keys(r)
    .filter((k) => isAttribute(k, r[k]))
    .map((field) => ({ field, group: 'participant', label: humanise(field) }));
  const person: PrivacyFieldMeta[] = Object.keys(r.person ?? {})
    .filter((k) => isAttribute(k, r.person[k]))
    .map((field) => ({ field, group: 'person', label: humanise(field) }));
  return [...participant, ...person];
}

/** Published when the attribute is `true` or carries a shape; stripped when `false` or absent. */
export function readField(policy: PrivacyPolicyData, group: 'participant' | 'person', field: string): boolean {
  const r = root(policy);
  const value = group === 'person' ? r.person?.[field] : r[field];
  return value === true || isShape(value);
}

/**
 * Set an attribute on both the direct participant/person and the doubles/team
 * `individualParticipants` branch, so singles and pair members stay consistent.
 *
 * On writes each level's TEMPLATE value: a shape stays a shape. An attribute the
 * policy lacks but the template names is written too, so a policy saved before the
 * factory added it (`teams`, 2026-10) can still be switched on.
 */
export function writeField(
  policy: PrivacyPolicyData,
  group: 'participant' | 'person',
  field: string,
  value: boolean,
  template: PrivacyPolicyData = emptyPrivacyPolicy()
): void {
  const templateLevels = levels(template);
  levels(policy).forEach((level, index) => {
    const target = level[group];
    const known = templateLevels[index]?.[group];
    if (!target || !(field in target || (known && field in known))) return;
    const published = known?.[field];
    target[field] = value ? (isShape(published) ? clone(published) : true) : false;
  });
}

/**
 * Fill every attribute the template names but the policy lacks with the template's default, at each level.
 *
 * A saved policy carries only the attributes that existed when it was saved. Without this, `teams` (added to the
 * factory default 2026-10) would read as stripped in every older policy, though nobody had ever been offered it.
 * Attributes the policy does carry are never changed.
 */
export function normalisePrivacyPolicy(
  policy: PrivacyPolicyData,
  template: PrivacyPolicyData = emptyPrivacyPolicy()
): PrivacyPolicyData {
  const templateLevels = levels(template);
  levels(policy).forEach((level, index) => {
    for (const group of ['participant', 'person'] as const) {
      const target = level[group];
      const known = templateLevels[index]?.[group];
      if (!target || !known) continue;
      for (const [field, value] of Object.entries(known)) {
        if (!(field in target) && isAttribute(field, value)) target[field] = clone(value);
      }
    }
  });
  return policy;
}

export function readPolicyName(policy: PrivacyPolicyData): string {
  return policy?.policyName ?? '';
}

export function writePolicyName(policy: PrivacyPolicyData, value: string): void {
  if (policy) policy.policyName = value;
}
