export declare function renderButton({ intent, size, label, onClick }?: {
    intent?: 'primary' | 'secondary';
    size?: 'medium';
    label?: string;
    onClick?: (args: {
        pointerEvent: MouseEvent;
    }) => void;
}): HTMLButtonElement;
