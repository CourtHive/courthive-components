import { matchUpStatusConstants } from 'tods-competition-factory';

// constants and types
import type { MatchUp, Participant } from '../../types';

const {
  WALKOVER,
  DEFAULTED,
  DOUBLE_WALKOVER,
  DOUBLE_DEFAULT,
  RETIRED,
  SUSPENDED,
  CANCELLED,
  IN_PROGRESS,
  ABANDONED,
  AWAITING_RESULT,
  DEAD_RUBBER,
  INCOMPLETE,
  BYE
} = matchUpStatusConstants;

/** The statuses that name a SIDE: one side retired, walked over or was defaulted. */
const EXIT_STATUSES = new Set<string>([RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT]);

/** Every status a side's pill shows. The exits name a side; the rest describe the MATCH and go on both. */
const SIDE_PILL_STATUSES = new Set<string>([
  ...EXIT_STATUSES,
  SUSPENDED,
  CANCELLED,
  IN_PROGRESS,
  ABANDONED,
  AWAITING_RESULT,
  DEAD_RUBBER,
  INCOMPLETE
]);

/**
 * The sides an EXIT actually belongs to, or `undefined` when the matchUp records none.
 *
 * `matchUpStatus` is a fact about the MATCH; a walkover is a fact about a SIDE. Rendering the
 * match-level status against every participant puts a `WO` beside a player who did appear — and
 * beside an empty slot that is merely reserved. Reported from TMX on a MAIN final that carried
 * `matchUpStatusCodes: [{ previousMatchUpStatus: DOUBLE_WALKOVER, matchUpStatus: WALKOVER,
 * sideNumber: 1 }, { sideNumber: 2 }]` — unambiguous that only side 1 exited — and rendered `WO` on
 * both sides.
 *
 * READ ORDER. `sideExitProvenance` is the first-class record and is preferred. It is a declared
 * field on `MatchUp` as of factory 7.0.0, mirrored onto this package's own `MatchUp` in
 * `src/types.ts`, so it is read directly. It used to be read through an `as unknown as` view; the
 * stated reason — that CI resolves the published package, where the field was absent — was a
 * misdiagnosis. A cast is erased at runtime and never governed whether the read found anything, and
 * this package's `MatchUp` carries `[key: string]: any` regardless. The declaration is what makes
 * the read typed; nothing about the access changed.
 *
 * `matchUpStatusCodes` REMAINS the fallback and is deliberately retained (CA, 2026-09-22). Its
 * provenance tenant is deprecated in factory 7.0.0 §24 and will be evicted behind `schemaWriteMode`,
 * but `sideExitProvenance` is a PERSISTED field whose writes are gated on `writeNativeEnabled()` —
 * false under LEGACY mode. So this path is the only one that renders an exit for a matchUp last
 * mutated by factory 6.x, still inside this package's peer range, or by a LEGACY-mode consumer.
 * It is consulted only when provenance is absent, so it costs nothing. Do not remove it without
 * re-opening that decision.
 *
 * A BARE `{ sideNumber }` ELEMENT IS A RESERVED SLOT, NOT AN EXIT. It is how the engine records a
 * side whose origin is not yet known, and it is exactly the element that must not raise a badge.
 *
 * Returning `undefined` means "this matchUp says nothing about sides" — a directly-entered walkover
 * or double walkover — and the caller then keeps the match-level behaviour.
 */
export function sidesCarryingExit(matchUp?: MatchUp): Set<number> | undefined {
  const provenance = matchUp?.sideExitProvenance;
  if (provenance) {
    const named = [1, 2].filter((sideNumber) => provenance[sideNumber]);
    if (named.length) return new Set(named);
  }

  const codes = matchUp?.matchUpStatusCodes;
  if (Array.isArray(codes)) {
    const named = new Set<number>();
    codes.forEach((element: any, index: number) => {
      if (!element || typeof element !== 'object') return;
      if (!element.previousMatchUpStatus && !element.matchUpStatus) return;
      const sideNumber = element.sideNumber ?? index + 1;
      if (sideNumber === 1 || sideNumber === 2) named.add(sideNumber);
    });
    if (named.size) return named;
  }

  return undefined;
}

/**
 * The exit ONE side carries, when its own record names one.
 *
 * A BYE matchUp can carry a propagated exit on the side that is not the BYE: the walkover arrived
 * beside the BYE and travelled on. The match-level status is `BYE`, so the status lists say nothing
 * about it and nothing rendered — a TD saw a plain BYE with no sign of what passed through.
 *
 * Decided by the side's OWN `matchUpStatus`, never by the presence of a record. The BYE side carries
 * provenance too (`BYE -> BYE`), and a naive "any side with a record" would put a `WO` on the BYE —
 * the mirror of the defect #577 fixed. A bare `{ sideNumber }` code is a reserved slot and names no
 * status, so it is excluded by the same test.
 *
 * Read order matches `sidesCarryingExit`: `sideExitProvenance` first, now as a declared field, then
 * the retained `matchUpStatusCodes` fallback. See that function for why the fallback stays.
 */
export function sideExitStatus(matchUp?: MatchUp, sideNumber?: number): string | undefined {
  if (sideNumber !== 1 && sideNumber !== 2) return undefined;

  const provenanceStatus = matchUp?.sideExitProvenance?.[sideNumber]?.matchUpStatus;
  if (provenanceStatus) return EXIT_STATUSES.has(provenanceStatus) ? provenanceStatus : undefined;

  const codes = matchUp?.matchUpStatusCodes;
  if (!Array.isArray(codes)) return undefined;
  const code: any = codes.find(
    (element: any, index: number) =>
      element && typeof element === 'object' && (element.sideNumber ?? index + 1) === sideNumber
  );
  const codeStatus = code?.matchUpStatus;
  return codeStatus && EXIT_STATUSES.has(codeStatus) ? codeStatus : undefined;
}

/**
 * Whether a side renders as the winner: the matchUp's `winningSide`, or the side of a BYE that holds a
 * participant (the one who advances).
 */
export function sideIsWinner({
  participant,
  sideNumber,
  matchUp
}: {
  participant?: Participant;
  sideNumber?: number;
  matchUp?: MatchUp;
}): boolean {
  const { winningSide, matchUpStatus } = matchUp || {};
  return Boolean((winningSide && sideNumber === winningSide) || (matchUpStatus === BYE && participant));
}

/**
 * The status a side's pill shows, or `undefined` when the side shows none.
 *
 * - A winning side never shows one (it shows the tick).
 * - An exit status shows only on the sides `sidesCarryingExit` names, or on both when nothing names a side.
 * - The other match-level statuses show on both sides.
 * - `configuration.liveStatusPill: false` drops the `IN_PROGRESS` (LIVE) pill.
 * - A side of a BYE matchUp shows the exit IT carries (`sideExitStatus`), never the matchUp's own BYE.
 */
export function sideStatusPill({
  liveStatusPill,
  isWinningSide,
  sideNumber,
  matchUp
}: {
  liveStatusPill?: boolean;
  isWinningSide?: boolean;
  sideNumber?: number;
  matchUp?: MatchUp;
}): string | undefined {
  if (isWinningSide) return undefined;
  const matchUpStatus = matchUp?.matchUpStatus;
  if (!matchUpStatus) return undefined;

  // BYE is in neither list — it is a fact about the MATCH — but a side of it can still carry a
  // propagated exit, which is the only thing that tells a TD a walkover arrived here and moved on.
  if (matchUpStatus === BYE) return sideExitStatus(matchUp, sideNumber);

  if (!SIDE_PILL_STATUSES.has(matchUpStatus)) return undefined;
  if (matchUpStatus === IN_PROGRESS && liveStatusPill === false) return undefined;

  // Match-level statuses describe the MATCH and belong on both sides.
  // The exits do not: they name a side, and `sidesCarryingExit` says which.
  const exitSides = EXIT_STATUSES.has(matchUpStatus) ? sidesCarryingExit(matchUp) : undefined;
  const sideOwnsTheExit = !exitSides || (sideNumber !== 1 && sideNumber !== 2) || exitSides.has(sideNumber);
  return sideOwnsTheExit ? matchUpStatus : undefined;
}
