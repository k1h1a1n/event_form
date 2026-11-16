/** Whether two names are the same, ignoring upper/lower case and spaces around them. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
