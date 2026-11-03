export declare function controlBar(params: {
    table?: any;
    targetClassName?: string;
    items?: any[];
    onSelection?: (rows: any[]) => void;
    target?: HTMLElement;
    selectItemFn?: (params: any) => void;
}): {
    elements: Record<string, HTMLElement>;
    inputs: Record<string, HTMLInputElement>;
};
