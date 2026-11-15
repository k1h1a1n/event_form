// The form stores dates as 'YYYY-MM-DD' strings; Material's datepicker works with Date objects.

/** 'YYYY-MM-DD' -> Date at local midnight, or null if it isn't a real day. */
export function isoDateToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // new Date() rolls a day that doesn't exist (Feb 30) over into the next month: reject it.
  return date.getMonth() === month - 1 ? date : null;
}

/** Date -> 'YYYY-MM-DD' (local). */
export function dateToIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
