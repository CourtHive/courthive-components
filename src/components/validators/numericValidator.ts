export function numericValidator(value: string | number): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return !isNaN(num) && Number.isInteger(num) && num >= 0;
}
