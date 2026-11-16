import {
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Schedule } from '../controls/schedule/schedule';
import { TicketTiers } from '../controls/ticket-tiers/ticket-tiers';
import { EMPTY_EVENT_SETUP, EventSetupModel } from '../models/event-setup.model';
import { ConfirmService } from '../shared/confirm-dialog';
import { DESCRIPTION_MAX_LENGTH, eventSetupSchema } from '../validators/event-setup.schema';
import { EventApi } from './event-api';

@Component({
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    Schedule,
    TicketTiers,
  ],
  selector: 'app-event-setup',
  styleUrl: './event-setup.scss',
  templateUrl: './event-setup.html',
  host: {
    // Fires when the user closes or reloads the tab; see warnBeforeLeaving below.
    '(window:beforeunload)': 'warnBeforeLeaving($event)',
  },
})
export class EventSetup {
  private readonly api = inject(EventApi);

  /**
   * The starting values for a new event, loaded from the API. A resource tracks the request
   * for us: isLoading() while it runs, error() if it failed, value() once it arrived.
   */
  protected readonly newEvent = resource({ loader: () => this.api.loadNewEvent() });

  /**
   * 1. The data the form edits. A linkedSignal: it follows the loaded event (whenever a new one
   *    arrives, it starts over from it) and holds the user's edits in between.
   */
  protected readonly model = linkedSignal<EventSetupModel>(() =>
    this.newEvent.hasValue() ? this.newEvent.value() : EMPTY_EVENT_SETUP,
  );

  /**
   * 2. The signal form built on that data. `eventForm.name` is the field for `model().name`.
   *    The second argument is the schema: the rules the data must follow.
   */
  protected readonly eventForm = form(this.model, eventSetupSchema);

  /** Which tab is open: 0 = General, 1 = Tickets. */
  protected readonly selectedTab = signal(0);

  /** Events can't be in the past, so the calendar starts at today. */
  protected readonly today = new Date();

  /** The description's limit, for the "64 / 500" counter (the same number the rule uses). */
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  /**
   * Whether something isn't saved yet. dirty() alone isn't enough: signal forms don't count
   * disabled fields as dirty, and the whole form is disabled while a save is running. Until
   * the API confirms, though, the changes aren't saved.
   */
  protected readonly hasUnsavedChanges = computed(
    () => this.eventForm().dirty() || this.eventForm().submitting(),
  );

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

  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);

  /**
   * The form was submitted: Save clicked, or Enter pressed in a field. Stop the browser's own
   * submit (it would reload the page), then save.
   */
  protected submitted(event: Event): void {
    event.preventDefault();
    this.save();
  }

  /**
   * Save. With errors: show them and go to the first one (nothing to confirm yet).
   * Without: ask first, then send the event to the API.
   */
  protected async save(): Promise<void> {
    if (this.eventForm().invalid()) {
      // Mark every field as touched, so fields the user never visited show their errors too.
      this.eventForm().markAsTouched();
      this.focusFirstError();
      return;
    }
    const confirmed = await this.confirm.ask({
      title: 'Save event?',
      message: 'Save the event with these details?',
      confirmLabel: 'Save',
    });
    if (confirmed) await this.sendToApi();
  }

  /**
   * Saves through the API with signal forms' submit(). While it waits, `submitting()` is true:
   * the schema disables the whole form and the Save button shows "Saving…". An error the
   * action returns lands on the field it names (here: the event name), like any other error.
   */
  private async sendToApi(): Promise<void> {
    try {
      const saved = await submit(this.eventForm, async () => {
        const nameProblem = await this.api.save(this.eventForm().value());
        return nameProblem
          ? { kind: 'nameTaken', message: nameProblem, fieldTree: this.eventForm.name }
          : undefined;
      });

      if (saved) {
        this.snackBar.open('Event saved.', 'OK', { duration: 4000 });
        this.startNewEvent(); // ready for the next event
      } else {
        // The form is enabled again only once it has re-rendered, so focus after that.
        afterNextRender(() => this.focusFirstError(), { injector: this.injector });
      }
    } catch {
      // The request itself failed (with a real server: network down, server error). The user's
      // input stays as it is, so they can simply try again.
      this.snackBar.open('The event could not be saved. Please try again.', 'OK');
    }
  }

  /** Reset button: after asking, start over with fresh starting values. */
  protected async reset(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Reset form?',
      message: 'Your changes will be lost and the form will go back to its default values.',
      confirmLabel: 'Reset',
    });
    if (confirmed) this.startNewEvent();
  }

  /**
   * Starts over: forget touched/dirty (so no messages and no "Unsaved changes"), go back to the
   * first tab, and load fresh starting values. When they arrive, `model` follows them.
   */
  private startNewEvent(): void {
    this.eventForm().reset();
    this.selectedTab.set(0);
    this.newEvent.reload();
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

  /**
   * Closing or reloading the tab with unsaved changes: cancelling the event makes the browser
   * ask "Leave site? Changes you made may not be saved." (browsers use their own wording).
   */
  protected warnBeforeLeaving(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
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
