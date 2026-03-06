import { describe, it, expect } from 'vitest';
import { filterPolicyCatalog, groupPolicyCatalog } from '../domain/catalogProjections';
import type { PolicyCatalogItem } from '../types';

const items: PolicyCatalogItem[] = [
  { id: '1', name: 'Default Scheduling', policyType: 'scheduling', source: 'builtin', description: 'Default scheduling policy', policyData: {} },
  { id: '2', name: 'Custom Scoring', policyType: 'scoring', source: 'user', description: 'Custom scoring rules', policyData: {} },
  { id: '3', name: 'Seeding Rules', policyType: 'seeding', source: 'builtin', description: 'Standard seeding', policyData: {} },
  { id: '4', name: 'Draw Policy', policyType: 'draws', source: 'user', description: 'Custom draw rules', policyData: {} },
  { id: '5', name: 'Avoidance Rules', policyType: 'avoidance', source: 'builtin', description: 'Club avoidance', policyData: {} },
];

describe('filterPolicyCatalog', () => {
  it('returns all items when query is empty', () => {
    const result = filterPolicyCatalog(items, '');
    expect(result).toHaveLength(5);
  });

  it('filters by name', () => {
    const result = filterPolicyCatalog(items, 'scheduling');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by description', () => {
    const result = filterPolicyCatalog(items, 'custom');
    expect(result).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    const result = filterPolicyCatalog(items, 'SCORING');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by source', () => {
    const result = filterPolicyCatalog(items, 'builtin');
    expect(result).toHaveLength(3);
  });

  it('returns empty array for no matches', () => {
    const result = filterPolicyCatalog(items, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('groupPolicyCatalog', () => {
  it('groups by type', () => {
    const result = groupPolicyCatalog(items, 'type');
    expect(result.size).toBeGreaterThan(0);
    // Scheduling is in Tournament Operations
    const ops = result.get('Tournament Operations');
    expect(ops).toBeDefined();
    expect(ops!.some((p) => p.policyType === 'scheduling')).toBe(true);
    expect(ops!.some((p) => p.policyType === 'avoidance')).toBe(true);
  });

  it('groups by source', () => {
    const result = groupPolicyCatalog(items, 'source');
    expect(result.has('Built-in Policies')).toBe(true);
    expect(result.has('User Policies')).toBe(true);
    expect(result.get('Built-in Policies')!).toHaveLength(3);
    expect(result.get('User Policies')!).toHaveLength(2);
  });

  it('removes empty groups when grouping by type', () => {
    const singleItem: PolicyCatalogItem[] = [
      { id: '1', name: 'Test', policyType: 'scheduling', source: 'builtin', description: '', policyData: {} },
    ];
    const result = groupPolicyCatalog(singleItem, 'type');
    // Only one group should remain
    expect(result.size).toBe(1);
    expect(result.has('Tournament Operations')).toBe(true);
  });
});
