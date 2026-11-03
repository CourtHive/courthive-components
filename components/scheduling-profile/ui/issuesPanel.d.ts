import { ProfileStoreState, UIPanel, FixAction } from '../types';
export interface IssuesPanelCallbacks {
    onFixAction: (action: FixAction) => void;
}
export declare function buildIssuesPanel(callbacks: IssuesPanelCallbacks): UIPanel<ProfileStoreState>;
