import { PolicyTypeMeta, PolicyTypeGroup } from '../types';
export declare const POLICY_TYPE_SCHEDULING = "scheduling";
export declare const POLICY_TYPE_SCORING = "scoring";
export declare const POLICY_TYPE_SEEDING = "seeding";
export declare const POLICY_TYPE_DRAWS = "draws";
export declare const POLICY_TYPE_AVOIDANCE = "avoidance";
export declare const POLICY_TYPE_FEED_IN = "feedIn";
export declare const POLICY_TYPE_PROGRESSION = "progression";
export declare const POLICY_TYPE_ROUND_NAMING = "roundNaming";
export declare const POLICY_TYPE_POSITION_ACTIONS = "positionActions";
export declare const POLICY_TYPE_MATCHUP_ACTIONS = "matchUpActions";
export declare const POLICY_TYPE_ROUND_ROBIN_TALLY = "roundRobinTally";
export declare const POLICY_TYPE_RANKING_POINTS = "rankingPoints";
export declare const POLICY_TYPE_COMPETITIVE_BANDS = "competitiveBands";
export declare const POLICY_TYPE_VOLUNTARY_CONSOLATION = "voluntaryConsolation";
export declare const POLICY_TYPE_PARTICIPANT = "participant";
export declare const POLICY_TYPE_DISPLAY = "display";
export declare const POLICY_TYPE_AUDIT = "audit";
export declare const POLICY_TYPE_PRIVACY = "participant";
export declare const POLICY_TYPE_METADATA: PolicyTypeMeta[];
/** Lookup metadata by policyType string */
export declare function getPolicyTypeMeta(policyType: string): PolicyTypeMeta | undefined;
/** Get empty policy data for a given policy type */
export declare function getEmptyPolicyData(policyType: string): Record<string, unknown>;
/** Get all unique group names in display order */
export declare const POLICY_TYPE_GROUPS: PolicyTypeGroup[];
