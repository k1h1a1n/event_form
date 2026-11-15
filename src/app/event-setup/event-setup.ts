import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { Schedule } from '../controls/schedule/schedule';
import { TicketTiers } from '../controls/ticket-tiers/ticket-tiers';
import { EMPTY_EVENT_SETUP } from '../models/event-setup.model';
import { eventSetupSchema } from '../validators/event-setup.schema';

@Component({
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    Schedule,
    TicketTiers,
  ],
  selector: 'app-event-setup',
  styleUrl: './event-setup.scss',
  templateUrl: './event-setup.html',
})
export class EventSetup {
  /** 1. The data, kept in a plain signal. Starts blank. */
  protected readonly model = signal(EMPTY_EVENT_SETUP);

  /**
   * 2. The signal form built on that data. `eventForm.name` is the field for `model().name`.
   *    The second argument is the schema: the rules the data must follow.
   */
  protected readonly eventForm = form(this.model, eventSetupSchema);

  /** Which tab is open: 0 = General, 1 = Tickets. */
  protected readonly selectedTab = signal(0);

  /** Events can't be in the past, so the calendar starts at today. */
  protected readonly today = new Date();

  /**
   * This form's own messages about the schedule (required, starts in the future), once touched.
   * Errors from the control's validate() carry no message: the control shows those itself.
   */
  protected readonly scheduleMessages = computed(() => {
    const schedule = this.eventForm.schedule();
    return schedule.touched() ? schedule.errors().flatMap((error) => error.message ?? []) : [];
  });

  /** Save button: print the form's value, but only when every rule passes. */
  protected save(): void {
    if (this.eventForm().invalid()) {
      // Mark every field as touched, so fields the user never visited show their errors too.
      this.eventForm().markAsTouched();
      this.focusFirstError();
      return;
    }
    console.log('Event form value:', this.eventForm().value());
  }

  /**
   * Reset button: blank every field, and forget touched/dirty so no error messages show.
   * (The form writes the blank value into the Schedule control through its writeValue.)
   */
  protected reset(): void {
    this.eventForm().reset(EMPTY_EVENT_SETUP);
  }

  /** Puts the cursor in the first field (in page order) that has an error. */
  private focusFirstError(): void {
    // errorSummary() lists the errors of the whole form, sorted by where their fields are on the page.
    const firstError = this.eventForm().errorSummary()[0];
    if (!firstError?.fieldTree) return;

    const focus = () => firstError.fieldTree().focusBoundControl();

    // All fields with rules are on the General tab for now. If it's already open, focus right
    // away. Otherwise open it, and focus once it has finished sliding in (tabShown below):
    // a field on a tab that isn't showing yet can't take focus.
    if (this.selectedTab() === 0) {
      focus();
    } else {
      this.focusWhenTabShown = focus;
      this.selectedTab.set(0);
    }
  }

  /** Something to focus once the tab that is opening has finished its animation. */
  private focusWhenTabShown: (() => void) | null = null;

  /** Called by the tab group when a newly opened tab has finished sliding in. */
  protected tabShown(): void {
    this.focusWhenTabShown?.();
    this.focusWhenTabShown = null;
  }
}
