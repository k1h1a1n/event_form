import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { Schedule } from '../controls/schedule/schedule';
import { TicketTiers } from '../controls/ticket-tiers/ticket-tiers';
import { ConfirmDialogData } from '../models/confirm-dialog.model';
import { defaultEventSetup } from '../models/event-setup.model';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { eventSetupSchema } from '../validators/event-setup.schema';
import { EventApi } from './event-api';

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
  /** 1. The data, kept in a plain signal. Starts with the default values. */
  protected readonly model = signal(defaultEventSetup());

  /**
   * 2. The signal form built on that data. `eventForm.name` is the field for `model().name`.
   *    The second argument is the schema: the rules the data must follow.
   */
  protected readonly eventForm = form(this.model, eventSetupSchema);

  /** Which tab is open: 0 = General, 1 = Tickets. */
  protected readonly selectedTab = signal(0);

  /** Events can't be in the past, so the calendar starts at today. */
  protected readonly today = new Date();

  /** This form's own messages about the schedule (starts in the future), once touched. */
  protected readonly scheduleMessages = computed(() => formMessages(this.eventForm.schedule()));

  /** This form's own messages about the ticket tiers (how many), once touched. */
  protected readonly ticketTierMessages = computed(() =>
    formMessages(this.eventForm.ticketTiers()),
  );

  /**
   * Whether a tab should show the alert icon: one of its fields is invalid and touched, which
   * is exactly when that field shows its messages. So icon and messages appear together.
   */
  protected readonly generalHasErrors = computed(() =>
    [this.eventForm.name, this.eventForm.description, this.eventForm.schedule].some(showsErrors),
  );
  protected readonly ticketsHasErrors = computed(() => showsErrors(this.eventForm.ticketTiers));

  private readonly api = inject(EventApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);

  /**
   * Save button. With errors: show them and go to the first one (nothing to confirm yet).
   * Without: ask first, then send the event to the API.
   */
  protected save(): void {
    if (this.eventForm().invalid()) {
      // Mark every field as touched, so fields the user never visited show their errors too.
      this.eventForm().markAsTouched();
      this.focusFirstError();
      return;
    }
    this.confirm(
      { title: 'Save event?', message: 'Save the event with these details?', confirmLabel: 'Save' },
      () => this.sendToApi(),
    );
  }

  /**
   * Saves through the API with signal forms' submit(). While it waits, `submitting()` is true:
   * the schema disables the whole form and the Save button shows "Saving…". An error the
   * action returns lands on the field it names (here: the event name), like any other error.
   */
  private async sendToApi(): Promise<void> {
    const saved = await submit(this.eventForm, async () => {
      const nameProblem = await this.api.save(this.eventForm().value());
      return nameProblem
        ? { kind: 'nameTaken', message: nameProblem, fieldTree: this.eventForm.name }
        : undefined;
    });

    if (saved) {
      this.resetToDefaults(); // start over for the next event
      this.snackBar.open('Event saved.', 'OK', { duration: 4000 });
    } else {
      // The form is enabled again only once it has re-rendered, so focus after that.
      afterNextRender(() => this.focusFirstError(), { injector: this.injector });
    }
  }

  /** Reset button: after asking, go back to the default values. */
  protected reset(): void {
    this.confirm(
      {
        title: 'Reset form?',
        message: 'Your changes will be lost and the form will go back to its default values.',
        confirmLabel: 'Reset',
      },
      () => this.resetToDefaults(),
    );
  }

  /**
   * Puts the default values back and forgets touched/dirty, so no error messages show and
   * Reset is disabled again. (The form writes the values into the controls through writeValue.)
   */
  private resetToDefaults(): void {
    this.eventForm().reset(defaultEventSetup());
    this.selectedTab.set(0);
  }

  /** Opens the confirmation popup and runs `onConfirm` only if the user says yes. */
  private confirm(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) onConfirm();
      });
  }

  /** Puts the cursor in the first field (in page order) that has an error. */
  private focusFirstError(): void {
    // errorSummary() lists the errors of the whole form, sorted by where their fields are on the page.
    const firstError = this.eventForm().errorSummary()[0];
    if (!firstError?.fieldTree) return;

    const field = firstError.fieldTree();
    const focus = () => field.focusBoundControl();

    // Ticket tiers is on the Tickets tab; everything else is on General. If that tab is already
    // open, focus right away. Otherwise open it, and focus once it has finished sliding in
    // (tabShown below): a field on a tab that isn't showing yet can't take focus.
    const tab = field === this.eventForm.ticketTiers() ? 1 : 0;
    if (this.selectedTab() === tab) {
      focus();
    } else {
      this.focusWhenTabShown = focus;
      this.selectedTab.set(tab);
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

/** True when a field has errors that are on screen: it is invalid and has been touched. */
function showsErrors(field: () => { invalid(): boolean; touched(): boolean }): boolean {
  return field().invalid() && field().touched();
}

/**
 * A field's messages from this form's own rules, once it is touched. Errors from a control's
 * validate() carry no message: the control shows those itself, next to the input concerned.
 */
function formMessages(field: { touched(): boolean; errors(): { message?: string }[] }): string[] {
  return field.touched() ? field.errors().flatMap((error) => error.message ?? []) : [];
}
