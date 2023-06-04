export function isNullish<T>(
  value: T | null | undefined
): value is null | undefined {
  return value === null || value === undefined;
}

export function isNonNullish<T>(value: T | null | undefined): value is T {
  return !isNullish(value);
}
