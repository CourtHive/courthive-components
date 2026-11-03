export interface NotesToolbarOptions {
    onBold?: () => void;
    onItalic?: () => void;
    onUnderline?: () => void;
    onStrike?: () => void;
    onHeading?: (level: number | false) => void;
    onColor?: (color: string) => void;
    onBackground?: (color: string) => void;
    onBulletList?: () => void;
    onOrderedList?: () => void;
    onAlign?: (align: string) => void;
    onBlockquote?: () => void;
    onCodeBlock?: () => void;
    onLink?: (url: string) => void;
    onVideo?: (url: string) => void;
    onClearFormatting?: () => void;
}
export declare function notesToolbar(options?: NotesToolbarOptions): HTMLElement;
export declare function updateToolbarState(toolbar: HTMLElement, activeMap: Record<string, boolean>): void;
export declare function updateHeadingSelect(toolbar: HTMLElement, level: number | false): void;
