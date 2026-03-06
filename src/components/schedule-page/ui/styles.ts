/**
 * Schedule Page — CSS class name exports.
 * Imports schedule-page.css (spl-* classes) and re-exports shared sp-* classes.
 */

import './schedule-page.css';

// Import scheduling-profile CSS for shared sp-* classes
import '../../scheduling-profile/ui/scheduling-profile.css';

// ── Layout (spl-*) ──

export const splLayoutStyle = () => 'spl-layout';
export const splLeftStyle = () => 'spl-left';
export const splToggleStyle = () => 'spl-toggle';
export const splCenterStyle = () => 'spl-center';
export const splCenterHeaderStyle = () => 'spl-center-header';
export const splCenterTitleStyle = () => 'spl-center-title';
export const splCenterMetaStyle = () => 'spl-center-meta';
export const splGridSlotStyle = () => 'spl-grid-slot';
export const splRightStyle = () => 'spl-right';

// ── MatchUp Card (spl-*) ──

export const splMatchUpCardStyle = () => 'spl-matchup-card';
export const splCardTitleStyle = () => 'spl-card-title';
export const splCardSidesStyle = () => 'spl-card-sides';
export const splCardMetaStyle = () => 'spl-card-meta';
export const splCardChipsStyle = () => 'spl-card-chips';
export const splCardChipStyle = () => 'spl-card-chip';

// ── Re-exported shared sp-* classes ──

export const spPanelStyle = () => 'sp-panel';
export const spPanelHeaderStyle = () => 'sp-panel-header';
export const spPanelTitleStyle = () => 'sp-panel-title';
export const spPanelMetaStyle = () => 'sp-panel-meta';
export const spPanelBodyStyle = () => 'sp-panel-body';
export const spDateStripStyle = () => 'sp-date-strip';
export const spDateChipStyle = () => 'sp-date-chip';
export const spBadgesStyle = () => 'sp-badges';
export const spBadgeStyle = () => 'sp-badge';
export const spCatalogStyle = () => 'sp-catalog';
export const spCatalogToolbarStyle = () => 'sp-catalog-toolbar';
export const spInputStyle = () => 'sp-input';
export const spSelectStyle = () => 'sp-select';
export const spGroupStyle = () => 'sp-group';
export const spGroupHeaderStyle = () => 'sp-group-header';
export const spGroupBodyStyle = () => 'sp-group-body';
export const spGroupChevronStyle = () => 'sp-group-chevron';
export const spIssuesStyle = () => 'sp-issues';
export const spIssueStyle = () => 'sp-issue';
export const spIssueCodeStyle = () => 'sp-issue-code';
export const spIssueMsgStyle = () => 'sp-issue-msg';
export const spInspectorStyle = () => 'sp-inspector';
export const spKvStyle = () => 'sp-kv';
export const spKvKeyStyle = () => 'sp-kv-key';
export const spKvValueStyle = () => 'sp-kv-value';
export const spSmallStyle = () => 'sp-small';
