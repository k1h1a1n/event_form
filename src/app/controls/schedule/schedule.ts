import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
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
import { MatDatepickerInput, MatDatepickerModule } from '@angular/material/datepicker';
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
  scheduleStart,
} from '../../validators/schedule.validators';

/** 90 -> '1 h 30 min', 60 -> '1 h', 45 -> '45 min'. */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours} h`, rest && `${rest} min`].filter(Boolean).join(' ');
}

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
   * Whether the form requires a schedule. Also filled in by [formField], from the form's
   * required() rule. When required, an empty schedule shows a message for each part.
   */
  readonly required = input(false);

  /** Earliest day the calendar lets the user pick. The form using the control decides (or not). */
  readonly minDate = input<Date | null>(null);

  /**
   * The last value the form wrote in. Every write counts, even an identical one: a reset writes
   * a value again precisely to throw away the user's edits.
   */
  private readonly written = signal<ScheduleValue>(EMPTY_SCHEDULE, { equal: () => false });

  /** What the inputs hold: the written value, plus the user's edits since. */
  protected readonly schedule = linkedSignal(() => this.written());

  /** Every rule checked against what the inputs hold: one message (or null) per part. */
  private readonly issues = computed(() => scheduleIssues(this.schedule(), this.required()));

  /** The messages to display: none until the field is touched, so we don't nag early. */
  protected readonly shownIssues = computed(() =>
    this.touched() ? this.issues() : NO_SCHEDULE_ISSUES,
  );

  /** For example "Ends at 8:00 PM · 1 h 30 min", once the schedule is complete and valid. */
  protected readonly summary = computed(() => {
    const schedule = this.schedule();
    const start = scheduleStart(schedule);
    const minutes = schedule.durationMinutes;
    if (!start || minutes === null || hasScheduleIssues(this.issues())) return null;

    const end = new Date(start.getTime() + minutes * 60_000);
    const day = end.getDate() === start.getDate() ? '' : 'the next day ';
    const time = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Ends ${day}at ${time} · ${formatDuration(minutes)}`;
  });

  // The three inputs, to fill them in and to move focus to the one with a problem.
  private readonly dateInput = viewChild.required<ElementRef<HTMLInputElement>>('dateInput');
  private readonly datepickerInput = viewChild.required('dateInput', { read: MatDatepickerInput });
  private readonly timeInput = viewChild.required<ElementRef<HTMLInputElement>>('timeInput');
  private readonly durationInput = viewChild.required<ElementRef<HTMLInputElement>>('duration');

  constructor() {
    // Each time the form writes a value, put it into the three inputs. Only then: what the user
    // types is never overwritten by our own updates (so '31/02/2026' or a half-typed '1.' stays),
    // and a reset always clears the inputs, even if the value was already empty before.
    afterRenderEffect({
      write: () => {
        const { date, startTime, durationMinutes } = this.written();
        this.datepickerInput().value = isoDateToDate(date); // the datepicker takes a Date
        this.timeInput().nativeElement.value = startTime;
        this.durationInput().nativeElement.value = durationMinutes?.toString() ?? '';
      },
    });

    // To focus a field, [formField] calls focus() on the control's host element, <app-schedule>.
    // That element can't take focus itself, so pass it on to the right input instead.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    host.focus = () => this.focusFirstProblem();
  }

  /** Focuses the first part with a problem, or the date when none has one. */
  focusFirstProblem(): void {
    const issues = this.issues();
    if (issues.date) this.dateInput().nativeElement.focus();
    else if (issues.startTime) this.timeInput().nativeElement.focus();
    else if (issues.durationMinutes) this.durationInput().nativeElement.focus();
    else this.dateInput().nativeElement.focus();
  }

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
