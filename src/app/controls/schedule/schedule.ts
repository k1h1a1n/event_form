import { Component, computed, input, linkedSignal, signal } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EMPTY_SCHEDULE, ScheduleValue } from '../../models/schedule.model';
import { dateToIsoDate, isoDateToDate } from '../../utils/date-time';
import { DayMonthYearDateAdapter } from '../../utils/day-month-year-date-adapter';
import {
  NO_SCHEDULE_ISSUES,
  hasScheduleIssues,
  isScheduleEmpty,
  scheduleIssues,
} from '../../validators/schedule.validators';

@Component({
  imports: [MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule],
  selector: 'app-schedule',
  styleUrl: './schedule.scss',
  templateUrl: './schedule.html',
  providers: [
    // "This component is a form control": the form talks to it through the
    // ControlValueAccessor methods below.
    { provide: NG_VALUE_ACCESSOR, useExisting: Schedule, multi: true },
    // "This component can check its own value": the form calls validate() below.
    { provide: NG_VALIDATORS, useExisting: Schedule, multi: true },
    // Material's datepicker works with Date objects through a DateAdapter. Ours reads and
    // shows dd/mm/yyyy. Provided here because Dates are an inside detail: the form only
    // ever sees 'YYYY-MM-DD' strings.
    { provide: DateAdapter, useClass: DayMonthYearDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
  ],
})
export class Schedule implements ControlValueAccessor, Validator {
  /**
   * Whether the form considers this field touched (the user left it, or pressed Save).
   * We don't bind this ourselves: [formField] fills in inputs with this name automatically.
   */
  readonly touched = input(false);

  /**
   * The last value the form wrote in. The three inputs start from this, and only this, so they
   * change when the form writes but never because of our own updates: what the user is typing
   * (even '31/02/2026') is never wiped. Every write counts, even an identical one: a form reset
   * writes the same value again precisely to throw away the user's edits.
   */
  protected readonly written = signal<ScheduleValue>(EMPTY_SCHEDULE, { equal: () => false });

  /** What the inputs hold: the written value, plus the user's edits since. */
  protected readonly schedule = linkedSignal(() => this.written());

  /** The datepicker works with a Date, so convert the written 'YYYY-MM-DD' for it. */
  protected readonly dateForPicker = computed(() => isoDateToDate(this.written().date));

  /** Every rule checked against what the inputs hold: one message (or null) per part. */
  private readonly issues = computed(() => scheduleIssues(this.schedule()));

  /** The messages to display: none until the field is touched, so we don't nag early. */
  protected readonly shownIssues = computed(() =>
    this.touched() ? this.issues() : NO_SCHEDULE_ISSUES,
  );

  // Callbacks the form gives us. Until it does, they do nothing.
  private onChange: (value: ScheduleValue | null) => void = () => {};
  protected onTouched: () => void = () => {};

  // ---- Form -> control ----

  /** The form calls this to put its value into the control. null means "nothing entered". */
  writeValue(value: ScheduleValue | null): void {
    this.written.set(value ?? EMPTY_SCHEDULE);
  }

  /** The form gives us a function to call whenever the user changes the value. */
  registerOnChange(fn: (value: ScheduleValue | null) => void): void {
    this.onChange = fn;
  }

  /** The form gives us a function to call when the user leaves the control. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // ---- Validation ----

  /**
   * The form calls this whenever the value changes. Returning an error object makes the
   * schedule field invalid, and with it the whole parent form.
   */
  validate(control: AbstractControl<ScheduleValue | null>): ValidationErrors | null {
    const issues = scheduleIssues(control.value);
    return hasScheduleIssues(issues) ? { schedule: issues } : null;
  }

  // ---- Control -> form ----

  /**
   * From the datepicker: the Date picked or typed, or null when the field is empty or its text
   * isn't a real dd/mm/yyyy day. Then we keep the text as typed, so the rules can say
   * "Enter a valid date." rather than acting as if nothing was entered.
   */
  protected setDate(date: Date | null, text: string): void {
    this.update({ ...this.schedule(), date: date ? dateToIsoDate(date) : text.trim() });
  }

  /** From the time input: already 'HH:mm', or '' while it isn't a complete time. */
  protected setStartTime(startTime: string): void {
    this.update({ ...this.schedule(), startTime });
  }

  protected setDuration(text: string): void {
    this.update({ ...this.schedule(), durationMinutes: text === '' ? null : Number(text) });
  }

  /** Keep the new value and send it to the form (as null once everything is cleared). */
  private update(value: ScheduleValue): void {
    this.schedule.set(value);
    this.onChange(isScheduleEmpty(value) ? null : value);
  }
}
