export { renderParticipant } from './components/renderParticipant';
export { renderParticipantInput } from './components/renderParticipantInput';
export { renderRoundHeader } from './components/renderRoundHeader';
export { renderStructure } from './components/renderStructure';
export { renderContainer } from './components/renderContainer';
export { renderMatchUp } from './components/renderMatchUp';
export { compositions } from './compositions/compositions';
export { renderRound } from './components/renderRound';
export { cModal } from './components/modal/cmodal';

// Mock participants generator modal
export { getMockParticipantsModal } from './components/modal/mockParticipants';
export type { MockParticipantsConfig } from './components/modal/mockParticipants';

// Match format selector modal
export { getMatchUpFormatModal } from './components/matchUpFormat/matchUpFormat';

// Age category editor modal
export { getAgeCategoryModal } from './components/categories/ageCategory/ageCategory';
export type { AgeCategoryConfig } from './components/categories/ageCategory/ageCategory';
export { getCategoryModal } from './components/categories/category/category';
export type { CategoryConfig, Category } from './components/categories/category/category';

// Flight profile editor modal
export { getFlightProfileModal } from './components/flightProfile/flightProfileNew';
export type { FlightProfileConfig } from './components/flightProfile/flightProfileNew';

// Scoring modals
export { scoringModal } from './components/scoring/scoringModal';
export { setScoringConfig, getScoringConfig, resetScoringConfig } from './components/scoring/config';
export type { ScoringModalParams, ScoreOutcome, SetScore } from './components/scoring/types';

// Dynamic Sets state management API (pure functions, testable)
export {
  getSetFormatForIndex,
  isSetTiebreakOnly,
  isSetTimed,
  getMaxAllowedScore,
  isSetComplete,
  getSetWinner,
  isMatchComplete,
  getMatchWinner,
  calculateComplement,
  shouldApplySmartComplement,
  shouldShowTiebreak,
  shouldCreateNextSet,
  buildSetScore
} from './components/scoring/logic/dynamicSetsLogic';
export type {
  SetFormat,
  MatchUpConfig,
  SmartComplementResult
} from './components/scoring/logic/dynamicSetsLogic';

// Drawer component
export { drawer, initDrawer } from './components/drawer/drawer';
export type { DrawerOptions } from './components/drawer/drawer';

// Tippy.js popover (CSS bundled in courthive-components.css)
import './styles/tippy.css';
import './styles/tipster.css';
export { tipster, destroyTipster } from './components/popover/tipster';

// Version API
export { courthiveComponentsVersion } from './version';

// Constants
export { MATCH_FORMATS } from './constants/matchUpFormats';
export type { MatchUpFormatCode } from './constants/matchUpFormats';

// Form renderers (import styles first)
import './components/forms/styles';
export { renderButtons } from './components/forms/renderButtons';
export { renderField, renderOptions } from './components/forms/renderField';
export { renderForm } from './components/forms/renderForm';
export { renderMenu } from './components/forms/renderMenu';
export { validator } from './components/forms/renderValidator';

// Form validators
export * as validators from './validators';
