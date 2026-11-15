import { TicketTier, TicketTierIssues } from '../models/ticket-tier.model';

const MAX_LABEL_LENGTH = 40;
const MAX_PRICE = 10_000;

/** No messages at all. */
export const NO_TICKET_TIER_ISSUES: TicketTierIssues = { label: null, price: null };

/**
 * The rules every list of tiers follows, wherever the control is used: one entry per tier.
 * How many tiers are needed is up to the form using the control (see event-setup.schema.ts).
 */
export function ticketTierIssues(tiers: readonly TicketTier[] | null): TicketTierIssues[] {
  const namesSoFar = new Set<string>();
  return (tiers ?? []).map((tier) => {
    const name = tier.label.trim().toLowerCase();
    const issues = { label: labelIssue(tier.label, namesSoFar.has(name)), price: priceIssue(tier.price) };
    if (name !== '') namesSoFar.add(name);
    return issues;
  });
}

/** True if any tier has a problem. */
export function hasTicketTierIssues(issues: readonly TicketTierIssues[]): boolean {
  return issues.some((tier) => tier.label !== null || tier.price !== null);
}

function labelIssue(label: string, takenByEarlierTier: boolean): string | null {
  if (label.trim() === '') return 'Name this tier.';
  if (label.trim().length > MAX_LABEL_LENGTH) return `Use at most ${MAX_LABEL_LENGTH} characters.`;
  if (takenByEarlierTier) return 'Another tier already has this name.';
  return null;
}

function priceIssue(price: number | null): string | null {
  if (price === null || Number.isNaN(price)) return 'Enter a price (0 if it is free).';
  if (price < 0) return 'The price cannot be negative.';
  if (price > MAX_PRICE) return `The price can be at most ${MAX_PRICE.toLocaleString('en-IN')}.`;
  // Compare with a tolerance: in floating point, 19.99 * 100 is 1998.9999999999998.
  if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) return 'Use at most 2 decimal places.';
  return null;
}
