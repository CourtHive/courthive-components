import { CatalogMatchUpItem, MatchUpSide, ScheduleCellSide } from '../types';
export declare function deepClone<T>(obj: T): T;
export declare function matchUpLabel(item: CatalogMatchUpItem): string;
export declare function participantLabel(side?: MatchUpSide): string;
/**
 * Everything a catalog item can be found by, as one lower-cased line.
 *
 * `sides[].participantName` alone left doubles players unfindable by their own
 * name: the factory composes a PAIR's `participantName` from family names only
 * (`Phoebus/Smith`), so a search for "Aiden Phoebus" matched his singles matchUps
 * and silently skipped every doubles matchUp he was in. `individualParticipants`
 * carries the given+family names that the pair name drops, so both are pushed.
 */
/**
 * "Aiden Phoebus / Ravi Smith" — a doubles side's members, spelled out in full.
 *
 * Empty for a singles side and for an un-hydrated pair, which is the caller's cue to
 * set no tooltip at all rather than an empty one.
 *
 * Pure and here rather than inline in the renderer so it can be tested without a DOM:
 * the ecosystem's DOM layer is Storybook play functions in a browser (`pnpm test:stories`), and a
 * pure function needs no browser to be checked.
 */
export declare function memberNamesLabel(side?: MatchUpSide | ScheduleCellSide): string;
export declare function matchUpSearchKey(item: CatalogMatchUpItem): string;
