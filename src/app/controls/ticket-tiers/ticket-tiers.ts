import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TicketTier } from '../../models/ticket-tier.model';
import {
  NO_TICKET_TIER_ISSUES,
  hasTicketTierIssues,
  ticketTierIssues,
} from '../../validators/ticket-tier.validators';

/**
 * One row on screen.
 * - `id` lets @for keep the same inputs while the user types, adds or removes rows.
 * - `seed` is what the row's inputs start with. They are filled from it, and only from it, so
 *   our own updates never overwrite what the user is typing.
 * - `tier` is the row's current value.
 */
interface Row {
  id: number;
  seed: TicketTier;
  tier: TicketTier;
}

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  selector: 'app-ticket-tiers',
  styleUrl: './ticket-tiers.scss',
  templateUrl: './ticket-tiers.html',
  providers: [
    // "This component is a form control": the form talks to it through the
    // ControlValueAccessor methods below.
    { provide: NG_VALUE_ACCESSOR, useExisting: TicketTiers, multi: true },
    // "This component can check its own value": the form calls validate() below.
    { provide: NG_VALIDATORS, useExisting: TicketTiers, multi: true },
  ],
})
export class TicketTiers implements ControlValueAccessor, Validator {
  /**
   * Whether the form considers this field touched (the user left it, or pressed Save).
   * We don't bind this ourselves: [formField] fills in inputs with this name automatically.
   */
  readonly touched = input(false);

  /** Most tiers allowed. Also filled in by [formField], from the form's maxLength() rule. */
  readonly maxLength = input<number | undefined>(undefined);

  /** Shown after each price. */
  readonly currency = input('INR');

  private nextId = 0;

  /** The rows on screen. */
  protected readonly rows = signal<Row[]>([]);

  /** The value the form sees: just the tiers, in order. */
  private readonly value = computed(() => this.rows().map((row) => row.tier));

  /** Every rule checked against the rows: one entry (label + price message) per row. */
  private readonly issues = computed(() => ticketTierIssues(this.value()));

  /** The messages to display: none until the field is touched, so we don't nag early. */
  protected readonly shownIssues = computed(() =>
    this.touched() ? this.issues() : this.issues().map(() => NO_TICKET_TIER_ISSUES),
  );

  /** True once the form's maximum is reached: then "Add" is hidden. */
  protected readonly atLimit = computed(() => {
    const max = this.maxLength();
    return max !== undefined && this.rows().length >= max;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // To focus a field, [formField] calls focus() on the control's host element,
    // <app-ticket-tiers>. That element can't take focus itself, so pass it on.
    this.host.focus = () => this.focusFirstProblem();
  }

  /** Focuses the first name or price with a problem; with no problem (or no rows), "Add". */
  focusFirstProblem(): void {
    const issues = this.issues();
    const row = issues.findIndex((tier) => tier.label !== null || tier.price !== null);
    const inputs = this.host.querySelectorAll<HTMLInputElement>('input'); // name, price, name, …
    const target =
      row === -1 ? this.host.querySelector<HTMLElement>('.add') : inputs[row * 2 + (issues[row].label ? 0 : 1)];
    target?.focus();
  }

  // Callbacks the form gives us. Until it does, they do nothing.
  private onChange: (value: TicketTier[]) => void = () => {};
  protected onTouched: () => void = () => {};

  // ---- Form -> control ----

  /**
   * The form calls this to put its value into the control. Every row is new (with a new id),
   * so the inputs are rebuilt from the written value; that is also how a reset clears them.
   */
  writeValue(tiers: TicketTier[] | null): void {
    this.rows.set((tiers ?? []).map((tier) => this.newRow(tier)));
  }

  /** The form gives us a function to call whenever the user changes the value. */
  registerOnChange(fn: (value: TicketTier[]) => void): void {
    this.onChange = fn;
  }

  /** The form gives us a function to call when the user leaves the control. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // ---- Validation ----

  /**
   * The form calls this whenever the value changes. Returning an error object makes the
   * ticket tiers field invalid, and with it the whole parent form.
   */
  validate(control: AbstractControl<TicketTier[] | null>): ValidationErrors | null {
    const issues = ticketTierIssues(control.value);
    return hasTicketTierIssues(issues) ? { ticketTiers: issues } : null;
  }

  // ---- Control -> form ----

  protected add(): void {
    // Finish the existing rows first: if one has a problem, show the messages (marking the field
    // touched makes them appear), move the cursor there, and don't add a new row yet.
    if (hasTicketTierIssues(this.issues())) {
      this.onTouched();
      this.focusFirstProblem();
      return;
    }
    // A fresh object every time: the form tags each item of the list with a tracking id,
    // so two rows must never share one object.
    this.rows.update((rows) => [...rows, this.newRow({ label: '', price: null })]);
    this.onChange(this.value());
  }

  protected remove(row: Row): void {
    this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
    this.onChange(this.value());
  }

  protected setLabel(row: Row, label: string): void {
    this.updateTier(row, { label });
  }

  protected setPrice(row: Row, text: string): void {
    this.updateTier(row, { price: text === '' ? null : Number(text) });
  }

  /** Replaces one row's tier with a changed copy (never edits in place), then tells the form. */
  private updateTier(row: Row, changes: Partial<TicketTier>): void {
    this.rows.update((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, tier: { ...r.tier, ...changes } } : r)),
    );
    this.onChange(this.value());
  }

  private newRow(tier: TicketTier): Row {
    return { id: this.nextId++, seed: tier, tier };
  }
}
