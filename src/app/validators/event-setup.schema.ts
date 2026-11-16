import {
  disabled,
  maxLength,
  minLength,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { EventSetupModel } from '../models/event-setup.model';
import { scheduleStart } from './schedule.validators';

/** The rules for the event setup form. */
export const eventSetupSchema = schema<EventSetupModel>((path) => {
  // Nothing can be edited while a save is in progress. Native inputs get `disabled`; the two
  // custom controls hear about it through their setDisabledState().
  disabled(path, { when: ({ state }) => state.submitting() });

  required(path.name, { message: 'Enter an event name.' });

  // The Schedule control checks its own parts (schedule.validators.ts) and treats an empty
  // schedule as fine. Whether this form needs one, and when it may start, is decided here.
  // No message for required: [formField] passes it to the control's `required` input, and the
  // control then shows "Enter a date." etc. under each empty part itself.
  required(path.schedule);
  validate(path.schedule, ({ value }) => {
    const start = scheduleStart(value());
    return start !== null && start.getTime() <= Date.now()
      ? { kind: 'startsInPast', message: 'The event has to start in the future.' }
      : undefined;
  });

  // The Ticket tiers control checks each row itself (ticket-tier.validators.ts). How many tiers
  // this event needs is decided here. maxLength also reaches the control as its `maxLength`
  // input, so it stops offering "Add" at the limit.
  minLength(path.ticketTiers, 1, { message: 'Add at least one ticket tier.' });
  maxLength(path.ticketTiers, 10, { message: 'An event can have at most 10 ticket tiers.' });
});
