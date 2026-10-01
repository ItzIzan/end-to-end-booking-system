export function normaliseVin(
  value: string
): string {
  return value
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();
}

export function normaliseReg(
  value: string
): string {
  return value
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toUpperCase();
}