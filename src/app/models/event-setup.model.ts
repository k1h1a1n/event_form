import { ScheduleValue } from './schedule.model';

/** The shape of the data the event setup form edits. */
export interface EventSetupModel {
  name: string;
  description: string;
  schedule: ScheduleValue | null; // null while nothing is entered
}
