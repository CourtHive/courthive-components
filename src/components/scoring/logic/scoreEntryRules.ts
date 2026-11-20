/**
 * The card's rules about endings, clearing and submitting — owned by the factory
 * (`tods-competition-factory/score-entry-state`) and re-exported here, with the three answers that speak to the
 * operator worded for this dialog.
 *
 * The factory answers whether an ending is offered, whether a score is finished, what Submit sends and when it is
 * live, and reports refusals as codes (`scoreEntryProblem`, `endingRefusal`). `scoreEntryError`,
 * `endingRefusalReason` and `footerState`'s `submitTitle` are those codes in the host's words. The CA rulings behind
 * each rule travel with the rule, in the factory.
 */
import { issueText } from './scoreEntrySelectors';
import { scoreEntryText } from './scoreEntryText';
import { statusScopeError } from './statusScope';
import { typedView } from './statusBoundary';
import {
  retractEndingContradictedByScore as factoryRetractEnding,
  resolutionInForce as factoryResolutionInForce,
  scoreIsFinished as factoryScoreIsFinished,
  endingOffered as factoryEndingOffered,
  scoreEntered as factoryScoreEntered,
  footerState as factoryFooterState,
  holdsEntry as factoryHoldsEntry,
  submission as factorySubmission,
  statusOutOfScope,
  scoreEntryIssue,
  endingRefusal
} from 'tods-competition-factory/score-entry-state';

import type {
  ClearGate,
  EndingIntent,
  ScoreEntryOutcome,
  ScoreEntryResolution,
  ScoreEntryView as FactoryView,
  ScoreEntryRulesContext as FactoryRulesContext
} from 'tods-competition-factory/score-entry-state';

export {
  contradictsFinishedScore,
  scoreLocked,
  clearScoreForEnding,
  clearGate,
  clearHeadline
} from 'tods-competition-factory/score-entry-state';
export type { ScoreEntryOutcome, ClearGateInput, ClearGate } from 'tods-competition-factory/score-entry-state';

/**
 * What the card's rules read: the model, and what the active region holds that the model cannot. The reported status
 * is held as a string, as Free Score's parser returns it (see `statusBoundary.ts`).
 */
export type ScoreEntryView = Omit<FactoryView, 'reportedStatus'> & { reportedStatus?: string };

/** Whether the SCORE is a finished result. */
export function scoreIsFinished(view: ScoreEntryView): boolean {
  return factoryScoreIsFinished(typedView(view));
}

/** Whether any score has been entered, in the model or as text the region holds. */
export function scoreEntered(view: ScoreEntryView): boolean {
  return factoryScoreEntered(typedView(view));
}

/** Whether anything at all has been entered. */
export function holdsEntry(view: ScoreEntryView): boolean {
  return factoryHoldsEntry(typedView(view));
}

/** The resolution in force: the operator's selection, or failing that whatever the region parsed. */
export function resolutionInForce(view: ScoreEntryView): ScoreEntryResolution {
  return factoryResolutionInForce(typedView(view));
}

/** Whether an ending can be chosen at all, given the score. */
export function endingOffered(
  status: string,
  view: ScoreEntryView,
  disabledMatchUpStatuses: readonly string[] = []
): boolean {
  return factoryEndingOffered(status, typedView(view), disabledMatchUpStatuses);
}

/** The ending a score that has just finished contradicts, as the intent that un-chooses it. */
export function retractEndingContradictedByScore(view: ScoreEntryView): EndingIntent | undefined {
  return factoryRetractEnding(typedView(view));
}

/** The host's scope and words, which every refusal message is built from. */
export type ScoreEntryRulesContext = FactoryRulesContext & {
  /** The card's labels: status names and `SCORE_ENTRY_TEXT` keys, defaults already merged in. */
  labels?: Record<string, string>;
  /** The participants' names, for an integrity message that names them rather than "side 1". */
  sideNames?: [string, string];
};

/** The status-scope refusal first, then the model's integrity message, naming the participants. */
export function scoreEntryError(view: ScoreEntryView, context: ScoreEntryRulesContext = {}): string | undefined {
  const { disabledMatchUpStatuses, labels, sideNames } = context;
  const status = resolutionInForce(view).matchUpStatus;
  if (statusOutOfScope(status, disabledMatchUpStatuses)) {
    return statusScopeError(status, disabledMatchUpStatuses, labels);
  }
  const issue = scoreEntryIssue(view.model);
  return issue ? issueText(issue, { sideNames, labels }) : undefined;
}

/** Why an ending control is disabled — out of scope, Retired with no score, or a finished score — in words. */
export function endingRefusalReason(
  status: string,
  view: ScoreEntryView,
  context: ScoreEntryRulesContext = {}
): string {
  const { disabledMatchUpStatuses, labels = {} } = context;
  const label = labels[status] ?? status;
  const refusal = endingRefusal(status, typedView(view), { disabledMatchUpStatuses });
  if (refusal === 'STATUS_UNAVAILABLE') return statusScopeError(status, disabledMatchUpStatuses, labels) as string;
  if (refusal === 'ENDING_NEEDS_SCORE') return scoreEntryText(labels, 'endingNeedsScore', { status: label });
  return scoreEntryText(labels, 'endingAfterCompleteScore', { status: label });
}

/** The footer's state: whether Submit and Clear are live, and what Submit's title says. */
export function footerState(
  view: ScoreEntryView,
  gate: ClearGate,
  context: ScoreEntryRulesContext = {}
): { submitDisabled: boolean; submitTitle: string; clearDisabled: boolean } {
  const { submitDisabled, submitRefusedNow, clearDisabled } = factoryFooterState(typedView(view), gate, {
    disabledMatchUpStatuses: context.disabledMatchUpStatuses
  });
  return {
    submitDisabled,
    submitTitle: submitRefusedNow ? scoreEntryText(context.labels, 'clearRefused') : '',
    clearDisabled
  };
}

/** What Submit sends, or `undefined` when it must send nothing. The host's words play no part in it. */
export function submission(
  view: ScoreEntryView,
  gate: ClearGate,
  context: ScoreEntryRulesContext = {}
): ScoreEntryOutcome | undefined {
  return factorySubmission(typedView(view), gate, { disabledMatchUpStatuses: context.disabledMatchUpStatuses });
}
