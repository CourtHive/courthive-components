import { MatchUpStatusUnion } from 'tods-competition-factory/score-entry-state';
/** A status as the factory reads it. */
export declare function asStatus(status: string | undefined): MatchUpStatusUnion | undefined;
/** A record whose status is held as a string, narrowed as the factory reads it. */
export declare function withStatus<T extends {
    matchUpStatus?: string;
}>(record: T | undefined): (Omit<T, 'matchUpStatus'> & {
    matchUpStatus?: MatchUpStatusUnion;
}) | undefined;
/** A view whose reported status is held as a string, narrowed as the factory reads it. */
export declare function typedView<V extends {
    reportedStatus?: string;
}>(view: V): Omit<V, 'reportedStatus'> & {
    reportedStatus?: MatchUpStatusUnion;
};
