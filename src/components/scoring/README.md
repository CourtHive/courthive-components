# Score Entry

`openScoreEntryDialog` is the scoring dialog: a card in a modal with three interchangeable entry
approaches over one set of geometry, a live format picker, irregular endings with their policy reason
codes, and reopening a recorded outcome. It replaced `scoringModal`, `setScoringConfig` and
`getScoringConfig`, which have been removed.

```typescript
import { openScoreEntryDialog } from 'courthive-components';

const dialog = openScoreEntryDialog({
  matchUp, // prefills a recorded outcome: matchUp.score.sets, matchUpStatus, winningSide
  sides: [{ participantName: 'Ann', seed: '1' }, { participantName: 'Bea' }],
  approach: 'dynamicSets', // 'dynamicSets' | 'freeScore' | 'dialPad'
  statusCodeGroups, // the scoring policy's matchUpStatusCodes; omitted, no reason chips are drawn
  clearable, // false when a later match depends on the result
  disabledMatchUpStatuses, // from the factory's SCORE matchUp action
  onApproachChange: (approach) => savePreference(approach),
  onSubmit: ({ outcome, sets }) => tournamentEngine.setMatchUpStatus({ matchUpId, drawId, outcome })
});
```

`onSubmit`'s `outcome` is already in the shape `setMatchUpStatus` reads. What a host passes and why is in
[`TMX_INTEGRATION.md`](./TMX_INTEGRATION.md).

## Layout

| Path                  | What it holds                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `scoreEntryDialog.ts` | The modal around the card: approach switching, the format picker, closing                                                                     |
| `scoreEntryCard.ts`   | The card: participant rows, endings and reasons, the band, Clear and Submit                                                                   |
| `regions/`            | One entry region per approach (Dynamic Sets, Free Score, Dial Pad) over the card                                                              |
| `logic/`              | The store the card renders from, the wording of the state engine's codes, and re-exports of it (`tods-competition-factory/score-entry-state`) |
| `utils/`              | No source since the factory took the set-expansion rules (#1045); one test of its outcome parsing                                             |

Stories: **Scoring / Score Entry** in Storybook (card, dialog, over a real draw, round trip).

## Thin package entry (unreleased)

Use `courthive-components/score-entry` for the existing dialog and format editor without the root bundle:

```typescript
import { openScoreEntryDialog, getMatchUpFormatModal } from 'courthive-components/score-entry';
import 'courthive-components/score-entry.css';
```

The host supplies its `--chc-*` theme tokens (or imports the shared theme stylesheet), caller-visible display data,
format, saved score and the server's action restrictions. Return a promise from `onSubmit` to keep the dialog open
until the host's command and refresh complete. A truthy `{ error }` or rejection keeps it open for correction.
The entry owns neither transport nor session state. Closing the dialog releases its UI resources.

Scoring uses factory `/score-entry-state`; status values use `/constants`. The format picker uses the canonical
codec and retention exports. Those six helper exports and `/constants` must be in the installed factory release;
7.43.0 and 7.44.0 are insufficient for the six format helpers. This branch must not merge or publish until the minimum factory peer version is raised to
the release containing both. No operator-document API is required by this package entry.

`pnpm verify:score-entry` checks source and built graphs with forbidden-import controls. `pnpm verify:score-entry:packed` packs this library and installs its declared factory version. Its explicit `--packed <components.tgz> <factory.tgz-or-version>` mode installs
both tarballs in an isolated consumer, compiles the exported types and drives the actual installed UI in Chromium.
