/**
 * Policy Catalog — Catalog Projections
 *
 * Pure functions to filter and group the policy catalog.
 */

import type { PolicyCatalogItem, CatalogGroupBy } from '../types';
import { getPolicyTypeMeta, POLICY_TYPE_GROUPS } from './policyDefaults';

/**
 * Filter catalog items by search query.
 * Matches against name, policyType label, description, and source.
 */
export function filterPolicyCatalog(
  catalog: PolicyCatalogItem[],
  searchQuery: string,
): PolicyCatalogItem[] {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return catalog;

  return catalog.filter((item) => {
    const meta = getPolicyTypeMeta(item.policyType);
    const hay = [
      item.name,
      item.description,
      item.policyType,
      meta?.label ?? '',
      item.source,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Group catalog items by type or source.
 * Returns a Map with stable group ordering.
 */
export function groupPolicyCatalog(
  catalog: PolicyCatalogItem[],
  groupBy: CatalogGroupBy,
): Map<string, PolicyCatalogItem[]> {
  const m = new Map<string, PolicyCatalogItem[]>();

  if (groupBy === 'type') {
    // Pre-seed groups in display order
    for (const group of POLICY_TYPE_GROUPS) {
      m.set(group, []);
    }
    for (const item of catalog) {
      const meta = getPolicyTypeMeta(item.policyType);
      const group = meta?.group ?? 'Display & Audit';
      const arr = m.get(group);
      if (arr) arr.push(item);
      else m.set(group, [item]);
    }
    // Remove empty groups
    for (const [key, items] of m) {
      if (items.length === 0) m.delete(key);
    }
  } else {
    // Group by source
    for (const item of catalog) {
      const key = item.source === 'builtin' ? 'Built-in Policies' : 'User Policies';
      const arr = m.get(key);
      if (arr) arr.push(item);
      else m.set(key, [item]);
    }
  }

  return m;
}
