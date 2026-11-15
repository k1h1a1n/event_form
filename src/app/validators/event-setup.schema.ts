import { required, schema, validate } from '@angular/forms/signals';
import { EventSetupModel } from '../models/event-setup.model';
import { scheduleStart } from './schedule.validators';

/** The rules for the event setup form. */
export const eventSetupSchema = schema<EventSetupModel>((path) => {
  required(path.name, { message: 'Enter an event name.' });

  // The Schedule control checks its own parts (schedule.validators.ts) and treats an empty
  // schedule as fine. Whether this form needs one, and when it may start, is decided here.
  required(path.schedule, { message: 'Choose when the event takes place.' });
  validate(path.schedule, ({ value }) => {
    const start = scheduleStart(value());
    return start !== null && start.getTime() <= Date.now()
      ? { kind: 'startsInPast', message: 'The event has to start in the future.' }
      : undefined;
  });
});
