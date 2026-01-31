# Validators Usage

The validators folder has been migrated from TMX to courthive-components and is now exported as a namespace.

## Available Validators

All validators are exported under the `validators` namespace:

```typescript
import { validators } from 'courthive-components';

// Name validation (min/max length)
validators.nameValidator(minLength: number, maxLength?: number) => (value: string) => boolean

// Numeric validation (positive integers)
validators.numericValidator(value: string | number) => boolean

// Numeric range validation (min/max values)
validators.numericRange(min: number, max: number) => (value: string | number) => boolean

// Password validation (8-12 chars, upper, lower, digit, special char)
validators.passwordValidator(value: string) => boolean

// Date validation (YYYY-MM-DD format)
validators.dateValidator(value: string) => boolean

// Word count validation (min/max words)
validators.wordValidator(minWords: number, maxWords?: number) => (value: string) => boolean

// Email validation
validators.emailValidator(value: string) => RegExpMatchArray | null
```

## Usage Examples

### In TMX Forms

Before:
```typescript
import { nameValidator } from '../validators/nameValidator';
import { numericRange } from '../validators/numericRange';

const items = [
  {
    field: DRAW_NAME,
    validator: nameValidator(4),
    error: 'minimum of 4 characters',
    // ...
  },
  {
    field: DRAW_SIZE,
    validator: numericRange(2, maxDrawSize),
    error: `Must be in range 2-${maxDrawSize}`,
    // ...
  }
];
```

After (using courthive-components):
```typescript
import { validators } from 'courthive-components';

const items = [
  {
    field: DRAW_NAME,
    validator: validators.nameValidator(4),
    error: 'minimum of 4 characters',
    // ...
  },
  {
    field: DRAW_SIZE,
    validator: validators.numericRange(2, maxDrawSize),
    error: `Must be in range 2-${maxDrawSize}`,
    // ...
  }
];
```

### In Category Modal

```typescript
import { validators } from 'courthive-components';

const items = [
  {
    label: 'Category Name',
    field: 'categoryName',
    validator: validators.nameValidator(5),
    error: 'Minimum 5 characters',
    // ...
  }
];
```

### Direct Usage

```typescript
import { validators } from 'courthive-components';

// Validate names
const isValidName = validators.nameValidator(3, 50)('John Doe'); // true

// Validate numeric ranges
const isValidAge = validators.numericRange(18, 120)(25); // true

// Validate emails
const isValidEmail = validators.emailValidator('user@example.com'); // matches

// Validate passwords
const isValidPwd = validators.passwordValidator('MyP@ss123'); // true
```

## Migration Path for TMX

Once the new version of courthive-components is published:

1. Replace all local validator imports with:
   ```typescript
   import { validators } from 'courthive-components';
   ```

2. Update all validator references:
   ```typescript
   nameValidator(4) → validators.nameValidator(4)
   numericRange(2, 10) → validators.numericRange(2, 10)
   // etc.
   ```

3. Remove the local `src/components/validators/` folder from TMX

4. This ensures validators stay in sync across all projects using courthive-components

## Benefits

- **Single source of truth**: All form validators in one place
- **Consistent validation**: Same rules across TMX, courthive-mobile, etc.
- **Easy updates**: Update validators once, all projects benefit
- **Type safety**: Full TypeScript support
- **Tree-shakeable**: Only validators you use are included in bundle
