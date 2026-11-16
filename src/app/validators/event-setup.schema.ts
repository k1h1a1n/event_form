import {
  disabled,
  maxLength,
  minLength,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { EventSetupModel } from '../models/event-setup.model';
import { scheduleStart } from './schedule.validators';

export const NAME_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 500;

/** The rules for the event setup form. */
export const eventSetupSchema = schema<EventSetupModel>((path) => {
  // Nothing can be edited while a save is in progress. Native inputs get `disabled`; the two
  // custom controls hear about it through their setDisabledState().
  disabled(path, { when: ({ state }) => state.submitting() });

  required(path.name, { message: 'Enter an event name.' });
  // required() accepts '   ', so also ask for at least one character that isn't a space.
  pattern(path.name, /\S/, { message: 'Enter an event name.' });
  // maxLength also sets the input's native maxlength, so typing stops at the limit; the rule
  // still catches longer text that is pasted in or loaded.
  maxLength(path.name, NAME_MAX_LENGTH, {
    message: `Use at most ${NAME_MAX_LENGTH} characters.`,
  });

  maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
    message: `Use at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  });

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
