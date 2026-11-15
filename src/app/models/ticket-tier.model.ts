/**
 * One entry in the value of the Ticket tiers control, for example { label: 'Early bird', price: 20 }.
 * It holds what the user has entered so far; whether it is valid is a separate question
 * (see validators/ticket-tier.validators.ts).
 */
export interface TicketTier {
  label: string;
  price: number | null; // in rupees (20 means 20.00), or null while not entered
}

/** One message per part of a tier: what is wrong with it, or null if it is fine. */
export type TicketTierIssues = Record<keyof TicketTier, string | null>;
