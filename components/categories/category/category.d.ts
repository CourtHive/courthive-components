export interface CategoryConfig {
    labels?: {
        title?: string;
        categoryNameLabel?: string;
        typeLabel?: string;
        ageCategoryCodeLabel?: string;
        ratingTypeLabel?: string;
        ratingMinLabel?: string;
        ratingMaxLabel?: string;
        ballTypeLabel?: string;
        notesLabel?: string;
    };
    options?: {
        types?: string[];
        ratingTypes?: string[];
        ballTypes?: string[];
    };
    defaultConsideredDate?: string;
    modalConfig?: any;
}
export interface Category {
    ageCategoryCode?: string;
    ageMax?: number;
    ageMaxDate?: string;
    ageMin?: number;
    ageMinDate?: string;
    ballType?: string;
    categoryName?: string;
    categoryType?: string;
    notes?: string;
    ratingMax?: number;
    ratingMin?: number;
    ratingType?: string;
    type?: 'AGE' | 'RATING' | 'BOTH';
}
/**
 * Opens the Category editor modal
 * @param existingCategory - Optional existing category to edit
 * @param editorConfig - Optional configuration for labels and options
 * @param callback - Called with the category when user clicks OK
 * @returns Modal result with open() and close() functions
 */
export declare function getCategoryModal(params: {
    existingCategory?: Category;
    editorConfig?: CategoryConfig;
    callback?: (category: Category) => void;
}): any;
