# Event Setup

## How to run

You need Node `^22.22.3`, `^24.15.0` or `>=26` (what Angular 22 supports).

npm install
npm start                    # opens on http://localhost:4200
npm test -- --watch=false    # runs the unit tests once (Vitest)
npm run build                # production build in dist/


## Notes

- There's no real backend. `event-api.ts` waits a moment like a request would, gives the starting
  values for a new event and saves events in `localStorage` (key `event-setup.saved-events`).
  Event names have to be unique, that's checked on "save" like a server would.
- After saving, the form starts a new event with default values.
- Dates are shown and typed as dd/mm/yyyy but stored as `YYYY-MM-DD`. Events can't start in the
  past.

## Answers

### 1. How does a value travel from the parent form into your ticket tiers control and back out again? What is the contract between them?

The page binds it with `<app-ticket-tiers [formField]="eventForm.ticketTiers" />` in
`event-setup.html`. `ticket-tiers.ts` provides `NG_VALUE_ACCESSOR` (through `provideFormControl`
in `shared/form-control.ts`), so `[formField]` uses the ControlValueAccessor path and calls
`writeValue` whenever the field's value changes or the form is reset.

In `writeValue` I turn each tier into a row with an `id`, a `seed` and the `tier`. The `id` is
what `@for` tracks, and the inputs only ever read from `seed`, so when I update a row while the
user is typing, Angular doesn't overwrite what's in the input.

Going out, every change (typing, add, remove) creates a new `rows` array and calls
`onChange(this.value())`, where `value` is just `rows().map(row => row.tier)`. I never mutate the
array the form gave me. Leaving an input calls `onTouched()`.

So the contract is: the value is a `TicketTier[]` (`{ label, price }`) exactly as the user has
typed it so far, half-filled rows included. Whether it's valid is reported separately.
`writeValue` never calls `onChange`. One thing I found out the hard way: signal forms puts a
tracking id on every array item, so new rows always need a fresh object. I was reusing one empty
tier object and two rows ended up sharing an id. A test caught it, there's a comment in `add()`.

### 2. How does an invalid row inside a control end up making the parent form invalid?

`ticket-tiers.ts` also provides `NG_VALIDATORS` and implements `validate()`. It runs
`ticketTierIssues()` from `validators/ticket-tier.validators.ts` on the value and returns
`{ ticketTiers: issues }` if any row has a problem (empty or duplicate name, missing or negative
price, and so on).

`[formField]` picks up that validator, runs it whenever the value changes and adds the result to
the field's errors. So `eventForm.ticketTiers()` becomes invalid, and since a parent is invalid
when one of its children is, `eventForm()` is invalid too. `save()` in `event-setup.ts` then marks
everything as touched and jumps to the first error instead of saving.

### 3. How does the surrounding form's state reach the inside of your controls?

All of it comes through `[formField]`:

- The value, through `writeValue`.
- Disabled, through `setDisabledState`. While a save is running the schema disables the whole
  form (`disabled(path, { when: ({ state }) => state.submitting() })`), so both controls lock their
  inputs and buttons and hide their messages.
- Other field state, through inputs. `[formField]` sets any input on the control that has the
  same name as a field property. Both controls have `touched`, so messages only show once the user
  has left the control or pressed Save. Schedule has `required` (because of the schema's
  `required(path.schedule)`, an empty schedule shows "Enter a date." etc. under each part) and
  Ticket tiers has `maxLength` (at 10 tiers the Add button turns into a note).
- Focus. When Save finds an error it calls `focusBoundControl()`. For a CVA that calls `focus()`
  on the host element, which can't take focus, so `redirectHostFocus()` in
  `shared/form-control.ts` sends it to the control's `focusFirstProblem()`.

### 4. Your controls are ControlValueAccessors, but the form around them is a signal form. How do the two fit together, and what would you do differently if you wrote the controls natively for signal forms instead?

When `[formField]` finds `NG_VALUE_ACCESSOR` it registers
`onChange` and `onTouched`, calls `writeValue` and `setDisabledState`, runs `NG_VALIDATORS` into
the field's errors.

Errors from `validate()` have no message. Errors on nested
fields like `schedule.durationMinutes` never reach the control, which is why I moved those rules
into the controls. Focus needs the redirect, and validation depends on the control being on screen.

Natively I'd implement `FormValueControl`: `value = model()` instead of `writeValue` and
`registerOnChange`, plain inputs for `disabled`, `touched`, `required` and `maxLength`, a `touch`
output and a real `focus()` method. So no providers, no callbacks and no focus trick. I'd also
move the row rules into a schema the form applies to the field (with `apply()`), so the errors
live in the form with proper messages, whether the control is rendered or not.

### 5. Point at one reactivity decision you made, and explain what would break if you had made the opposite choice.

In `schedule.ts` the three inputs are only filled from `written`, which is the last value the form
wrote, and `written` is created with `{ equal: () => false }`. What the user types goes into
`schedule`, a `linkedSignal` that starts over from `written` on every write.

If I had bound the inputs to the current value instead (`[value]="schedule().date"`), my own
updates would rewrite the inputs while the user is typing. For example typing `31/02/2026` would
get cleared instead of showing "Enter a valid date.", because the datepicker gets `null` for a
day that doesn't exist and empties the field.

And with the default equality, writing the same value again would just be ignored. So in a form
that starts with an empty schedule, if you type a date and then reset, the form writes the same
empty value again, nothing changes, and the date you typed stays on screen while the form thinks
the schedule is empty.
