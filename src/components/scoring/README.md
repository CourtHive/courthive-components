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

| Path                  | What it holds                                                                    |
| --------------------- | -------------------------------------------------------------------------------- |
| `scoreEntryDialog.ts` | The modal around the card: approach switching, the format picker, closing        |
| `scoreEntryCard.ts`   | The card: participant rows, endings and reasons, the band, Clear and Submit      |
| `regions/`            | One entry region per approach (Dynamic Sets, Free Score, Dial Pad) over the card |
| `logic/`              | The pure model and store the card renders, and the engine-outcome mapping        |
| `utils/`              | Set-expansion rules shared by the model                                          |

Stories: **Scoring / Score Entry** in Storybook (card, dialog, over a real draw, round trip).
