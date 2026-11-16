/**
 * True if any part has a message, i.e. a problem. Works for every "issues" object in the app:
 * a schedule's ({ date, startTime, durationMinutes }) and one ticket tier's ({ label, price }).
 */
export function hasIssues(issues: Record<string, string | null>): boolean {
  return Object.values(issues).some((message) => message !== null);
}
