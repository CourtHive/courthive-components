import '../../styles/components/buttons.css';
import '../../styles/components/forms.css';
import '../../styles/components/switch.css';

/** Score entry without the root components bundle or a tournament engine. */
export { openScoreEntryDialog } from './scoreEntryDialog';
export { getMatchUpFormatModal } from '../matchUpFormat/matchUpFormat';
export type { ScoreEntryDialog, ScoreEntryDialogParams, ScoreEntryApproach } from './scoreEntryDialog';
export type { MatchUpFormatConfig } from '../matchUpFormat/matchUpFormat';
