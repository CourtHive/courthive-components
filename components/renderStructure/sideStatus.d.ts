import { MatchUp, Participant } from '../../types';
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
export declare function sidesCarryingExit(matchUp?: MatchUp): Set<number> | undefined;
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
export declare function sideExitStatus(matchUp?: MatchUp, sideNumber?: number): string | undefined;
/**
 * Whether a side renders as the winner: the matchUp's `winningSide`, or the side of a BYE that holds a
 * participant (the one who advances).
 */
export declare function sideIsWinner({ participant, sideNumber, matchUp }: {
    participant?: Participant;
    sideNumber?: number;
    matchUp?: MatchUp;
}): boolean;
/**
 * The status a side's pill shows, or `undefined` when the side shows none.
 *
 * - A winning side never shows one (it shows the tick).
 * - An exit status shows only on the sides `sidesCarryingExit` names, or on both when nothing names a side.
 * - The other match-level statuses show on both sides.
 * - `configuration.liveStatusPill: false` drops the `IN_PROGRESS` (LIVE) pill.
 * - A side of a BYE matchUp shows the exit IT carries (`sideExitStatus`), never the matchUp's own BYE.
 */
export declare function sideStatusPill({ liveStatusPill, isWinningSide, sideNumber, matchUp }: {
    liveStatusPill?: boolean;
    isWinningSide?: boolean;
    sideNumber?: number;
    matchUp?: MatchUp;
}): string | undefined;
