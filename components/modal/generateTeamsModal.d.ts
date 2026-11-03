export interface GenerateTeamsConfig {
    callback?: (participants: any[]) => void;
    consideredDate?: string;
    title?: string;
    /** Builtin + user tieFormats for team size inference */
    tieFormats?: {
        label: string;
        value: string;
        tieFormat: any;
    }[];
    /** Custom labels for form fields and buttons */
    labels?: {
        gender?: string;
        teamsCount?: string;
        tieFormatTemplate?: string;
        manualTeamSize?: string;
        playersPerTeam?: string;
        countries?: string;
        cancel?: string;
        generate?: string;
        genderAny?: string;
        genderFemale?: string;
        genderMale?: string;
    };
}
export declare function getGenerateTeamsModal(config?: GenerateTeamsConfig): void;
