export function validateRequired(checks: [boolean, string][]): string | null {
  for (const [invalid, message] of checks) {
    if (invalid) return message
  }
  return null
}
