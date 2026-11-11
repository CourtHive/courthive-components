/** Visible help attached to the field's control for keyboard and screen-reader users. */
export declare function addFieldHint(field: HTMLElement, text: string): void;
export declare function buildToggleField(label: string, checked: boolean, onChange: (val: boolean) => void, disabled?: boolean): {
    element: HTMLElement;
    setChecked: (v: boolean) => void;
    setDisabled: (v: boolean) => void;
};
export declare function buildSelectField(label: string, options: Array<{
    value: string;
    label: string;
}>, currentValue: string, onChange: (val: string) => void, disabled?: boolean): {
    element: HTMLElement;
    setValue: (v: string) => void;
    setDisabled: (v: boolean) => void;
};
export declare function buildTextInputField(label: string, currentValue: string, onChange: (val: string) => void, placeholder?: string, disabled?: boolean): {
    element: HTMLElement;
    setValue: (v: string) => void;
};
export declare function buildColorField(label: string, currentValue: string, onChange: (val: string) => void, disabled?: boolean): {
    element: HTMLElement;
    setValue: (v: string) => void;
};
