import { TicketTier, TicketTierIssues } from '../models/ticket-tier.model';
import { sameName } from '../utils/text';

const MAX_LABEL_LENGTH = 40;
const MAX_PRICE = 10_000;

/** No messages at all. */
export const NO_TICKET_TIER_ISSUES: TicketTierIssues = { label: null, price: null };

/**
 * The rules every list of tiers follows, wherever the control is used: one entry per tier.
 * How many tiers are needed is up to the form using the control (see event-setup.schema.ts).
 */
export function ticketTierIssues(tiers: readonly TicketTier[] | null): TicketTierIssues[] {
  return (tiers ?? []).map((tier, index, all) => {
    const takenByEarlierTier = all
      .slice(0, index) //will return all tiers before this one
      .some((earlier) => sameName(earlier.label, tier.label)); //true if any earlier tier has the same name
    return { label: labelIssue(tier.label, takenByEarlierTier), price: priceIssue(tier.price) };
  });
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
  if (!hasAtMostTwoDecimals(price)) return 'Use at most 2 decimal places.';
  return null;
}

/** 19.99 is fine, 19.999 isn't. Compared with a tolerance: in floating point 19.99 * 100 is 1998.9999999999998. */
function hasAtMostTwoDecimals(price: number): boolean {
  const cents = price * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}
