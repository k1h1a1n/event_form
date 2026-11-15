import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { TicketTier } from '../../models/ticket-tier.model';
import { TicketTiers } from './ticket-tiers';

/** A tiny signal form that uses the Ticket tiers control the same way the event page does. */
@Component({
  imports: [TicketTiers, FormField],
  template: `<app-ticket-tiers [formField]="eventForm.ticketTiers" />`,
})
class Host {
  readonly model = signal<{ ticketTiers: TicketTier[] }>({
    ticketTiers: [
      { label: 'Early bird', price: 20 },
      { label: 'Standard', price: 35 },
    ],
  });
  readonly eventForm = form(this.model, (path) => {
    maxLength(path.ticketTiers, 3);
  });
}

describe('TicketTiers', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  /** All name and price inputs: name, price, name, price, … */
  function inputs(): HTMLInputElement[] {
    return [...fixture.nativeElement.querySelectorAll('app-ticket-tiers input')];
  }

  /** Types into an input the way a user would. */
  async function type(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(selector: string, index = 0): Promise<void> {
    fixture.nativeElement.querySelectorAll(selector)[index].click();
    await fixture.whenStable();
  }

  /** The error messages currently shown under the inputs. */
  function messages(): string[] {
    return [...fixture.nativeElement.querySelectorAll('app-ticket-tiers mat-hint.error')]
      .map((hint: HTMLElement) => hint.textContent!.trim())
      .filter(Boolean);
  }

  it('shows the tiers the form writes in, one row each', () => {
    expect(inputs().map((input) => input.value)).toEqual(['Early bird', '20', 'Standard', '35']);
  });

  it('reports edits, added rows and removed rows to the form as one list', async () => {
    await type(inputs()[3], '40'); // Standard's price
    await click('.add');
    await type(inputs()[4], 'VIP');
    await type(inputs()[5], '100');
    await click('.remove', 0); // remove Early bird

    // toMatchObject: the form also tags each list item with a hidden tracking id (a Symbol key).
    expect(host.model().ticketTiers).toMatchObject([
      { label: 'Standard', price: 40 },
      { label: 'VIP', price: 100 },
    ]);
  });

  it('makes the parent form invalid while a row is invalid', async () => {
    await click('.add'); // a new, empty row: no name, no price
    expect(host.eventForm().invalid()).toBe(true);

    await type(inputs()[4], 'VIP');
    await type(inputs()[5], '100');
    expect(host.eventForm().valid()).toBe(true);
  });

  it('shows row messages only once the field is touched', async () => {
    await type(inputs()[2], 'early BIRD'); // same name as the first tier
    await type(inputs()[3], '-5');
    expect(messages()).toEqual([]);

    host.eventForm().markAsTouched(); // what Save does
    await fixture.whenStable();
    expect(messages()).toEqual(['Another tier already has this name.', 'The price cannot be negative.']);
  });

  it('shows the problems of existing rows, instead of adding a row, while one is invalid', async () => {
    await type(inputs()[3], ''); // clear Standard's price
    await click('.add');

    expect(inputs().length).toBe(4); // still 2 rows
    expect(messages()).toEqual(['Enter a price (0 if it is free).']);
    expect(document.activeElement).toBe(inputs()[3]); // the cursor is on the empty price
  });

  it("stops offering Add at the form's maximum", async () => {
    await click('.add'); // 3 tiers: the form's maxLength
    expect(fixture.nativeElement.querySelector('.add')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('That is the maximum of 3 tiers.');
  });

  it('clears the rows when the form is reset', async () => {
    await type(inputs()[0], 'Super early');

    host.eventForm().reset({ ticketTiers: [] });
    await fixture.whenStable();

    expect(inputs()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No ticket tiers yet.');
  });
});
