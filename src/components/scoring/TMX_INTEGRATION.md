# TMX Integration Guide - Score Entry Dialog

Quick reference for integrating `openScoreEntryDialog` into TMX or another host. It replaced
`scoringModal`, which has been removed.

## Translating the dialog

Every word the dialog shows has a key in `SCORE_ENTRY_TEXT` (exported), with its English as the value. Pass
translations through `labels`, the same map that carries the status names (`RETIRED`, …) and
`statusUnavailable`. A key left out reads English. Placeholders use the i18next form, `{{name}}`, and the
dialog fills them, so an i18next host hands its strings over unformatted:

```typescript
const labels = Object.fromEntries(
  Object.keys(SCORE_ENTRY_TEXT).map((key) => [key, t(`modals.scoreEntry.${key}`, { skipInterpolation: true })])
);
openScoreEntryDialog({ matchUp, sides, labels: { ...statusLabels, ...labels }, onSubmit });
```

Set messages carry `{{ordinal}}` (`1st`, English only) and `{{number}}` (`1`); a language without ordinals
uses `{{number}}`. Score strings, format codes, participant names, and messages the factory itself returns
are not translated by the dialog. `scoreEntryTranslations.test.ts` fails if any default English survives
with every key translated.

## Scoped status choices

The factory SCORE action can publish `disabledMatchUpStatuses: string[]`, computed with the same scope checker as `setMatchUpStatus`. Pass it unchanged to `openScoreEntryDialog`, beside `clearable`:

```typescript
const scoreAction = validActions.find(({ type }) => type === 'SCORE');
openScoreEntryDialog({
  matchUp,
  sides,
  onSubmit,
  clearable,
  disabledMatchUpStatuses: scoreAction?.disabledMatchUpStatuses
});
```

The dialogs remove these choices from status pickers, refuse parsed aliases in Free Score and explain that the status is unavailable for this match. A saved restricted status remains visible but cannot be resubmitted; it can be cleared or corrected. Missing metadata preserves the existing vocabulary for older factory versions and other hosts. Components do not infer scope from draw names or types. The engine remains authoritative at submission; TMX rechecks the metadata before dispatching.

Hosts can translate scope notices and typed-input refusals. For the card/dialog,
pass status-keyed `labels` (for example `DEAD_RUBBER: 'Match sans enjeu'`) plus
`statusUnavailable: '{{status}} indisponible pour ce match'`. Scope messages use those names; they do not derive translated names
from enum constants. English remains the default for hosts that omit labels.

Factory rule: DEAD_RUBBER is permitted on a tie rubber or DOUBLE_ELIMINATION Decider; CHALLENGED is LADDER only. These are factory rules, not conditions implemented by the dialogs.

## The dialog reports an engine-ready `outcome` — hand it to `setMatchUpStatus` (2026-10-08)

CA: _"Shouldn't the new score entry modal be built in such a way that it cleanly understands and
integrates with the factory setMatchUpStatus method?"_ It does now. `openScoreEntryDialog`'s `onSubmit`
argument carries **`outcome`**, already in the engine's shape, so a host does none of the bridging the
table below describes:

```typescript
openScoreEntryDialog({
  matchUp,
  sides,
  statusCodeGroups,
  onSubmit: ({ outcome }) =>
    mutationRequest({ methods: [{ method: 'setMatchUpStatus', params: { drawId, matchUpId, outcome } }] })
});
```

`outcome.score.sets` carries the sets; a chosen reason is a positional `matchUpStatusCodes`; a clear is
`{ score: { sets: [] }, matchUpStatusCodes: [] }`; a format changed through the chip rides as
`matchUpFormat` (an unchanged one is left to the engine's own). The mapping is `logic/engineOutcome.ts`,
exported as `toEngineOutcome` for a host that builds an outcome by hand. The raw fields (`score` string,
`sets`, `reasonCode`, `cleared`) are still reported beside it, unchanged.

**Whether a clear will be accepted is the engine's to say, so pass it in as `clearable`.** A clear is
refused when a later match depends on the result, and only the draw knows that: the factory publishes it
as the `CLEAR_SCORE` matchUp action, present only when a clear would succeed. Pass
`clearable: validActions.some(({ type }) => type === 'CLEAR_SCORE')` for a matchUp that holds a result.
`false` keeps `[Clear]` offered, because it also resets the form before a replacement score is typed, but
refuses submitting the empty card, with `labels.clearRefused` (or a default) as Submit's tooltip. Omitted,
`[Clear]` and `[Submit]` behave as they always have.

The table that follows is what the raw fields would need, kept as the measured record behind the mapping.

## The score-entry dialog and the engine: what the outcome has to become

Measured 2026-10-01 against published factory **7.4.0** and against factory `dev` at `cff5c3d7c0`,
by calling `tournamentEngine.setMatchUpStatus` with each shape over a mocks-engine draw and reading the
matchUp back. The story that shows it is `Scoring/Score Entry Over a Draw` and the mapping it uses is
`src/stories/helpers/scoreEntryEngineHost.ts` (`toEngineOutcome`). Every case below is pinned in
`src/stories/__tests__/scoringStories.test.ts`, so a factory release that changes an answer fails there.

**Re-measured 2026-10-05 against published factory 7.5.0: all five rows still hold.** Two of them
(top-level `sets`, `reasonCode`) were described here but not pinned in their forwarded-as-is form; they
are now. 7.5.0's completeness rule does not close the `sets` row: it validates the score it is given, and
a score sent at the top level is never given to it, so the result is a COMPLETED matchUp with a winner
and no score at all.

`openScoreEntryDialog`'s `onSubmit` reports:

```typescript
{ matchUpStatus?, winningSide?, reasonCode?, score?: string, cleared?: true, sets: SetScore[] }
```

`setMatchUpStatus` reads from `outcome`: **`score.sets`**, **`winningSide`**, **`matchUpStatus`**,
**`matchUpStatusCodes`** and **`matchUpFormat`**. Nothing else. The two shapes differ in five places,
and a host has to bridge each one:

| the dialog reports                                  | the engine wants                                                        | what happens if you forward it as-is                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `score` as a **string** (`'6-4 6-3'`)               | `score: { sets }` — it derives `scoreStringSide1/2` itself, every time  | **refused**, `ERR_INVALID_VALUES`, on every Submit                                 |
| `sets` at the top level                             | `score.sets`                                                            | ignored: recorded COMPLETED with the winner and **no score**                       |
| `reasonCode: 'W1'`                                  | `matchUpStatusCodes: ['', 'W1']` — positional, the exiting side's index | ignored; the reason is lost                                                        |
| `cleared: true`                                     | `{ score: { sets: [] }, matchUpStatusCodes: [] }`                       | **not a clear**: the winner is dropped and the stale score stays, as `IN_PROGRESS` |
| a format chosen through the chip (`onFormatChange`) | `outcome.matchUpFormat`, persisted once the result is accepted          | the format change is lost                                                          |

Details that decide the mapping:

- **The engine mutates the `outcome` it is handed** — it writes the derived strings into `outcome.score`.
  Pass a copy if you intend to log or reuse what was sent.
- **`matchUpStatusCodes` values are trusted, positions mostly are not.** For a single exit the engine
  reads the side off `winningSide` (`['W1']` with `winningSide: 1` files side 2). For a double exit the
  index IS the side: send `[code, code]`. For an ending that resolves nobody (`CANCELLED`, `ABANDONED`,
  `INCOMPLETE`) send `[code]`; it is filed as `matchUpStatusCode`. It stores the split as
  `sideStatusCodes` / `matchUpStatusCode`, which is what the dialog reads back on reopen.
- **Send `matchUpStatusCodes` only when a reason was chosen** (TMX's existing rule in
  `services/transitions/scoreMatchUp.ts`): an empty array blanks the codes. The one place to send the
  empty array deliberately is the clear, because **a cleared result keeps its reason code otherwise** —
  measured: a walkover cleared with `{ score: { sets: [] } }` alone resets to `TO_BE_PLAYED` with
  `sideStatusCodes: { 2: 'W1' }` still on the record.
- **A set needs BOTH tiebreak scores.** `{ side2TiebreakScore: 3 }` alone is refused
  (`non-numeric values`). The model reports both (`7`/`3` for a `7-6(3)`), so this only bites a host
  building sets by hand.
- **`matchUpStatus` may be omitted** for a played result; `COMPLETED` is derived from `winningSide`.
  The dialog always reports it, so forward it.

### The engine refuses an unfinished set — from factory 7.5.0 (#5096)

Note 10 of `scoreEntryNotes.txt`: _"I'm sure if this went to the factory it would return an error"_.
Through factory 7.4.0 it did not: the engine checked set **bounds**, not **completeness**, and
recorded `4-2 2-6 2-6` and `3-7 6-4 6-4` as `COMPLETED`. Factory #5096 refuses both with
`ERR_INVALID_SCORE` and an `info` naming the set (`Set 1: …`), and leaves the matchUp unchanged.
Re-measured 2026-10-05 against published 7.5.0: `validateScore` and `setMatchUpStatus` both refuse
`4-2 2-6 2-6` under `SET3-S:6/TB7`, and both accept `6-4 2-6 2-6`:

- every set before the last must be finished;
- the last must be finished too when the outcome claims completion (`COMPLETED`, or a `winningSide`
  with no status). For any other status — RETIRED, IN_PROGRESS, SUSPENDED — it may be open;
- `disableScoreValidation: true` on `setMatchUpStatus` opts out, for imports and history corrections.

The card's refusal before Submit is no longer the only guard, but it remains the first: the host
should show the engine's `info` if a refusal ever comes back, since the operator then needs to know
which set is wrong.

### A reopened result focuses no entry cell

CA, 2026-10-01: _"a reopened completed matchUp should not focus any entry cell at all."_ When the
`matchUp` handed in carries a winner, a double exit, or a score that decides the match, the dialog
focuses its own section rather than a cell, so every finished set opens folded (`7` over `6³`) and
the way back in is clicking the folded set. A part-score with no winner — a suspension, a match still
being entered — keeps the caret in set 1's lower cell. `autoFocus: false` still leaves focus alone.

### Reopening on what the engine holds

Pass the in-context matchUp straight through:

```typescript
const { matchUp } = tournamentEngine.findMatchUp({ drawId, matchUpId, inContext: true });
openScoreEntryDialog({ sides: sidesOf(matchUp), matchUpFormat: matchUp.matchUpFormat, matchUp, ... });
```

`matchUp.score.sets`, `matchUpStatus`, `winningSide`, `sideStatusCodes` and `matchUpStatusCode` are
exactly what the dialog hydrates from. A `DOUBLE_WALKOVER` comes back on both rows with its reason
chip pressed; a walkover comes back against the side that exited.
