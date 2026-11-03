import { CatalogRoundItem, SchedulingProfile, ValidationResult, AvailabilityAdapter, DemandAdapter, DependencyAdapter, FlattenedRound } from '../types';
export interface ValidateProfileParams {
    profile: SchedulingProfile;
    availability?: AvailabilityAdapter;
    demand?: DemandAdapter;
    dependencies?: DependencyAdapter;
    venueOrder?: string[];
    /** The round catalog; its `playingDates` drive the EVENT_DATE_INACTIVE warning. */
    roundCatalog?: CatalogRoundItem[];
}
export declare function validateProfile({ profile, availability, demand, dependencies, venueOrder, roundCatalog }: ValidateProfileParams): ValidationResult[];
export declare function validateRoundPrecedenceLocal({ profile }: {
    profile: SchedulingProfile;
    venueOrder?: string[];
}): ValidationResult[];
export declare function flatten(profile: SchedulingProfile): FlattenedRound[];
