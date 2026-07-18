import { describe, expect, it } from 'vitest';

import { normalizeSignupPii } from '../buildHiveIDLogin';

const DOB = '1990-04-12';

describe('normalizeSignupPii', () => {
  it('returns an empty object when nothing is entered', () => {
    expect(normalizeSignupPii({})).toEqual({});
    expect(normalizeSignupPii({ birthDate: '', sex: '' })).toEqual({});
  });

  it('trims and passes through DOB + sex', () => {
    expect(normalizeSignupPii({ birthDate: ` ${DOB} `, sex: ' F ' })).toEqual({ birthDate: DOB, sex: 'F' });
  });

  it('omits an empty field rather than sending an empty string (partial entry)', () => {
    expect(normalizeSignupPii({ birthDate: DOB, sex: '' })).toEqual({ birthDate: DOB });
    expect(normalizeSignupPii({ birthDate: '   ', sex: 'M' })).toEqual({ sex: 'M' });
  });
});
