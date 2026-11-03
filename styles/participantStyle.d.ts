export declare function getPlacholderStyle({ variant }: {
    variant?: string;
}): string;
export declare const participantStyle: (_opts?: {
    variant?: string;
}) => string;
export declare const participantNameStyle: (opts?: {
    variant?: string;
}) => string;
export declare const participantTypeStyle: (opts?: {
    variant?: string;
}) => string;
export declare function getParticipantContainerStyle({ drawPosition: _drawPosition, sideNumber }: {
    drawPosition?: number | string;
    sideNumber?: number;
}): string;
export declare function getDrawPositionData(drawPosition?: number | string): string | undefined;
