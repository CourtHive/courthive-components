/**
 * Where this package's status STRINGS become the factory's statuses.
 *
 * `tods-competition-factory/score-entry-state` types every matchUpStatus as `MatchUpStatusUnion`, so a misspelled
 * status cannot compile against a constant. This package holds them as `string`: its `MatchUp` mirror predates the
 * union, because the peer range admits an older factory major (`types.ts`). Each module here that hands a status to
 * the factory keeps its `string` signature and narrows once, through these, so a host's API is unchanged. Nothing is
 * validated here: the factory's own predicates already treat an unknown status as no status.
 */
import type { MatchUpStatusUnion } from 'tods-competition-factory/score-entry-state';

/** A status as the factory reads it. */
export function asStatus(status: string | undefined): MatchUpStatusUnion | undefined {
  return status as MatchUpStatusUnion | undefined;
}

/** A record whose status is held as a string, narrowed as the factory reads it. */
export function withStatus<T extends { matchUpStatus?: string }>(
  record: T | undefined
): (Omit<T, 'matchUpStatus'> & { matchUpStatus?: MatchUpStatusUnion }) | undefined {
  return record as (Omit<T, 'matchUpStatus'> & { matchUpStatus?: MatchUpStatusUnion }) | undefined;
}

/** A view whose reported status is held as a string, narrowed as the factory reads it. */
export function typedView<V extends { reportedStatus?: string }>(
  view: V
): Omit<V, 'reportedStatus'> & { reportedStatus?: MatchUpStatusUnion } {
  return view as Omit<V, 'reportedStatus'> & { reportedStatus?: MatchUpStatusUnion };
}
