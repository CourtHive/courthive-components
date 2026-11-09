import { buildParticipantSection } from './sections/participantSection';
import { buildPlaceholderSection } from './sections/placeholderSection';
import { buildDisplaySection } from './sections/displaySection';
import { buildColorsSection } from './sections/colorsSection';
import { buildLayoutSection } from './sections/layoutSection';
import { buildThemeSection } from './sections/themeSection';
import { buildScoreSection } from './sections/scoreSection';
import { buildScaleSection } from './sections/scaleSection';

// constants and types
import type { SectionDef } from './sections/sectionBuilder';

export const COMPOSITION_EDITOR_SECTIONS: SectionDef[] = [
  { id: 'theme', label: 'Theme & Preset', factory: buildThemeSection },
  { id: 'colors', label: 'Colors', factory: buildColorsSection },
  { id: 'display', label: 'Display', factory: buildDisplaySection },
  { id: 'score', label: 'Score', factory: buildScoreSection },
  { id: 'participant', label: 'Participant', factory: buildParticipantSection },
  { id: 'placeholder', label: 'Placeholders', factory: buildPlaceholderSection },
  { id: 'scale', label: 'Scale Attributes', factory: buildScaleSection },
  { id: 'layout', label: 'Layout & Info', factory: buildLayoutSection }
];
