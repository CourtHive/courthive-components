import { PolicyCatalogItem, CatalogGroupBy } from '../types';
/**
 * Filter catalog items by search query.
 * Matches against name, policyType label, description, and source.
 */
export declare function filterPolicyCatalog(catalog: PolicyCatalogItem[], searchQuery: string): PolicyCatalogItem[];
/**
 * Group catalog items by type or source.
 * Returns a Map with stable group ordering.
 */
export declare function groupPolicyCatalog(catalog: PolicyCatalogItem[], groupBy: CatalogGroupBy): Map<string, PolicyCatalogItem[]>;
