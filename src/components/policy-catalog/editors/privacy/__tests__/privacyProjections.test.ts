import { PrivacyEditorStore } from '../privacyEditorStore';
import { describe, expect, it } from 'vitest';
import {
  normalisePrivacyPolicy,
  emptyPrivacyPolicy,
  privacyFields,
  readField,
  writeField
} from '../domain/privacyProjections';

/**
 * The factory's privacy default now names `teams` as a SHAPE, an object template applied to each team an
 * individual belongs to, rather than a flag. The editor listed only boolean attributes, so `teams` could
 * not be toggled, and a policy saved before it existed stripped it silently.
 *
 * These tests pass the template explicitly, so they do not depend on which factory release is installed.
 */
const TEAMS_SHAPE = { participantId: true, participantName: true, participantOtherName: true, participantType: true };

/** The installed factory template with `teams` added at both levels, as the factory default now ships it. */
function templateWithTeams() {
  const template = emptyPrivacyPolicy();
  template.participant.teams = { ...TEAMS_SHAPE };
  template.participant.individualParticipants.teams = { ...TEAMS_SHAPE };
  return template;
}

/** A policy saved before `teams` existed: the same template with the key absent at both levels. */
function policySavedBeforeTeams() {
  const policy = templateWithTeams();
  delete policy.participant.teams;
  delete policy.participant.individualParticipants.teams;
  return policy;
}

const levels = (policy: any) => [policy.participant, policy.participant.individualParticipants];

describe('privacyFields', () => {
  it('lists a shape attribute as a participant toggle', () => {
    const fields = privacyFields(templateWithTeams());
    expect(fields).toContainEqual({ field: 'teams', group: 'participant', label: 'Teams' });
  });

  it('never lists the nested groups themselves', () => {
    const names = privacyFields(templateWithTeams()).map((meta) => meta.field);
    expect(names).not.toContain('person');
    expect(names).not.toContain('individualParticipants');
    // control: ordinary flags are still listed
    expect(names).toContain('participantName');
    expect(names).toContain('birthDate');
  });
});

describe('a shape attribute toggles between the shape and false', () => {
  it('reads a shape as published and false as stripped', () => {
    const policy = templateWithTeams();
    expect(readField(policy, 'participant', 'teams')).toBe(true);
    policy.participant.teams = false;
    expect(readField(policy, 'participant', 'teams')).toBe(false);
  });

  it('off writes false at both levels', () => {
    const policy = templateWithTeams();
    writeField(policy, 'participant', 'teams', false, templateWithTeams());
    for (const level of levels(policy)) expect(level.teams).toBe(false);
  });

  it('on writes the template shape at both levels, never true', () => {
    // `true` would publish each whole team element: contacts, members, everything.
    const policy = templateWithTeams();
    writeField(policy, 'participant', 'teams', false, templateWithTeams());
    writeField(policy, 'participant', 'teams', true, templateWithTeams());
    for (const level of levels(policy)) expect(level.teams).toEqual(TEAMS_SHAPE);
  });

  it('can switch on an attribute an older policy lacks', () => {
    const policy = policySavedBeforeTeams();
    writeField(policy, 'participant', 'teams', true, templateWithTeams());
    for (const level of levels(policy)) expect(level.teams).toEqual(TEAMS_SHAPE);
  });

  it('still ignores a field the template does not name', () => {
    const policy = templateWithTeams();
    writeField(policy, 'participant', 'notAnAttribute', true, templateWithTeams());
    for (const level of levels(policy)) expect(level.notAnAttribute).toBeUndefined();
  });

  it('flags are unchanged: on writes true', () => {
    const policy = templateWithTeams();
    writeField(policy, 'person', 'birthDate', true, templateWithTeams());
    expect(policy.participant.person.birthDate).toBe(true);
    expect(policy.participant.individualParticipants.person.birthDate).toBe(true);
  });
});

describe('normalisePrivacyPolicy', () => {
  it('fills an attribute an older policy lacks with the template default, at both levels', () => {
    const policy = normalisePrivacyPolicy(policySavedBeforeTeams(), templateWithTeams());
    for (const level of levels(policy)) expect(level.teams).toEqual(TEAMS_SHAPE);
  });

  it('never changes an attribute the policy carries', () => {
    const saved = policySavedBeforeTeams();
    saved.participant.teams = false;
    saved.participant.person.birthDate = true;
    const policy = normalisePrivacyPolicy(saved, templateWithTeams());
    expect(policy.participant.teams).toBe(false);
    expect(policy.participant.person.birthDate).toBe(true);
    // the level that lacked it is still filled
    expect(policy.participant.individualParticipants.teams).toEqual(TEAMS_SHAPE);
  });

  it('gives each level its own copy of the shape', () => {
    const policy = normalisePrivacyPolicy(policySavedBeforeTeams(), templateWithTeams());
    policy.participant.teams.participantName = false;
    expect(policy.participant.individualParticipants.teams.participantName).toBe(true);
  });
});

describe('PrivacyEditorStore normalises what it loads', () => {
  it('a policy loaded without a key reads every installed-template attribute', () => {
    const saved = emptyPrivacyPolicy();
    delete saved.participant.participantName;
    const store = new PrivacyEditorStore({ initialPolicy: saved });
    expect(store.getData().participant.participantName).toBe(true);
    expect(store.getState().dirty).toBe(false);
  });
});
