export interface SelectItemParams {
    title: string;
    placeholder?: string;
    options: SelectItemOption[];
    selectionLimit?: number;
    /** Factory to create a selection table. If not provided, a simple list is used. */
    createTable?: (config: {
        anchorId: string;
        data: any[];
        selectionLimit?: number;
        onSelected: (value: any[]) => void;
    }) => {
        table: any;
        destroy?: () => void;
    };
    /** Factory to create a search filter function for the table. */
    createFilter?: (table: any) => (value: string) => void;
}
export interface SelectItemOption {
    label: string;
    onClick?: () => void;
    [key: string]: any;
}
export declare function selectItem(params: SelectItemParams): void;
