import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { TicketTiers } from '../controls/ticket-tiers/ticket-tiers';
import { Schedule, ScheduleValue } from '../controls/schedule/schedule';

/** The shape of the data this form edits. Name and schedule for now. */
interface EventSetupModel {
  name: string;
  schedule: ScheduleValue;
}

@Component({
  imports: [
    FormField,
    JsonPipe,
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
  /** 1. The data, kept in a plain signal (with sample values so you can see them load). */
  protected readonly model = signal<EventSetupModel>({
    name: '',
    schedule: { date: '2026-12-05', startTime: '18:30', durationMinutes: 90 },
  });

  /**
   * 2. The signal form built on that data. `eventForm.name` is the field for `model().name`.
   *    The second argument is the schema: the rules the data must follow.
   */
  protected readonly eventForm = form(this.model, (path) => {
    required(path.name, { message: 'Enter an event name.' });
    // The duration rules live in the Schedule control itself (its validate() method).
  });

  /** Save button: print the form's value, but only when every rule passes. */
  protected save(): void {
    if (this.eventForm().invalid()) {
      // Mark every field as touched, so fields the user never visited show their errors too.
      this.eventForm().markAsTouched();
      return;
    }
    console.log('Event form value:', this.eventForm().value());
  }
}
