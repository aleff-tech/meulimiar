# Goal-Based Training Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace weeks/load-preference inputs with a race date and finish-time goal, then generate a conservative phase-based plan and consistent web/XLSX outputs.

**Architecture:** Keep the existing React/Vite application and domain-first plan generator. Add date-only calendar and goal-assessment helpers, extend structured weekly/session data for phases and target-pace segments, then adapt the form, preview, timeline and XLSX exporter to consume those domain results.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, `xlsx`; no new dependencies or backend.

**Spec:** `docs\superpowers\specs\2026-11-06-goal-based-training-plan-design.md`

## Global Constraints

- Target distances remain `3`, `5`, `10`, `21.1`, and `42.2` km.
- The race date is future; cycles shorter than four weeks generate a conservative plan and warning; the existing upper limit remains 24 calendar weeks.
- Race goals use hours, minutes, and seconds; preserve the current 5 km time bounds and pace anchors: `20:00` → `5:20/4:15/3:55`, `22:30` → `6:00/4:45/4:25`, `25:00` → `6:40/5:15/4:50` min/km.
- Goal-time hours are `0–23`; minutes and seconds are `0–59`; total goal time must be positive.
- Compare goals using the Riegel exponent `1.06` only as a heuristic; warn when the goal is at least 5% faster than the estimate and cap prescribed race-pace segments at the current interval pace.
- Weekly volume growth is capped at 5%; recovery reduces volume by 20% every fourth week; final taper is 60% of peak.
- Weeks begin Monday; first/last weeks may be partial, and the race is a separate event excluded from training sessions and weekly distance.
- Show adult-specific BMI guidance only after explicit 18+ confirmation; BMI never automatically changes paces or workload.
- Keep warm-up, work/recovery, and cool-down in one “Treino principal” column; timeline width represents duration and segment height represents speed.
- XLSX mirrors the goal/date/phases and consolidated workout text; the visual timeline remains web-only.
- Keep all personal inputs in the browser; do not add dependencies, remote storage, or new workout modalities.

## Review Focus

- **Invalid, past, and >24-week dates; partial Monday-based weeks:** tests must verify date-only parsing, week boundaries, race-day exclusion, and no training dates before today in Tasks 1 and 3.
- **Goal at the 5% ambition threshold or faster than current interval pace:** Task 2 tests the warning boundary, the Riegel estimate, and the pace cap.
- **Low weekly distance and 1–2 sessions for longer targets:** Task 3 tests that session distribution, distance totals, and existing long-run/quality safeguards remain valid.
- **BMI at 30 with/without 18+ confirmation:** Tasks 1 and 4 test that the numeric BMI remains informative but adult guidance is gated correctly.
- **5 km results outside the 20:00–25:00 anchors:** Task 2 tests unchanged clamping and warning behavior while goal assessment uses the entered time.

---

## File Map

- `src\domain\profile.ts` — typed form/profile fields and validation for race date, goal time, and adult confirmation.
- `src\domain\calendar.ts` — new date-only parsing and Monday-based week-window helpers.
- `src\domain\paces.ts` — Riegel estimate, goal assessment, ambition flag, and prescribed target-pace cap.
- `src\domain\trainingPlan.ts` — phases, calendar week metadata, conservative progression, warnings, and goal-pace segments.
- `src\domain\workoutText.ts` — new shared formatter for a complete session from structured segments.
- `src\components\TrainingForm.tsx` and `src\App.tsx` — new inputs and pass-through to domain logic.
- `src\components\TrainingPreview.tsx`, `src\components\WorkoutTimeline.tsx`, `src\styles.css` — event/phases, consolidated workout column, and time/speed chart.
- `src\export\workbook.ts` — summary and weekly plan updated to match the new model.
- Existing tests in `src\domain\profile.test.ts`, `src\domain\paces.test.ts`, `src\domain\trainingPlan.test.ts`, `src\components\WorkoutTimeline.test.tsx`, `src\App.test.tsx`, and `src\export\workbook.test.ts` — focused coverage for each domain/UI/export change.

### Task 1: Add date-aware profile inputs and calendar windows

**Files:**
- Create: `src\domain\calendar.ts`
- Modify: `src\domain\profile.ts`
- Test: `src\domain\profile.test.ts`
- Test: `src\domain\calendar.test.ts`

**Interfaces:**
- Produces `RunnerProfile.raceDate: string` (`YYYY-MM-DD`), `goalTimeSeconds: number`, and `adultConfirmed: boolean`.
- Produces `RunnerFormValues.raceDate`, `goalTimeHours`, `goalTimeMinutes`, `goalTimeSeconds`, and `adultConfirmed`.
- Produces `parseLocalDate(value: string): Date | undefined`, `toLocalDateString(date: Date): string`, and `getCalendarWeekWindows(today: Date, raceDate: string): CalendarWeekWindow[]`.
- `CalendarWeekWindow` contains `startDate: string`, `endDate: string`, and `availableTrainingDays: number` (calendar days before race day).
- `parseRunnerProfile(values: RunnerFormValues, today?: Date): ProfileParseResult` uses an injectable `today` for deterministic validation tests.

- [ ] **Step 1: Write failing profile/date tests**

Add tests proving valid future race dates and goal times parse; malformed/past dates, invalid clock components, and a cycle beyond 24 calendar weeks fail; a future date inside four weeks remains valid; `adultConfirmed` defaults through the profile as a boolean without being required. Add calendar cases for Monday boundaries, a partial first/last week, leap day, and race-day exclusion.

- [ ] **Step 2: Run focused tests and verify the new cases fail**

Run: `npm test -- --run src\domain\profile.test.ts src\domain\calendar.test.ts`
Expected: FAIL because the new profile fields and calendar helpers do not exist.

- [ ] **Step 3: Implement date-only helpers and update profile validation**

In `calendar.ts`, parse local calendar dates without UTC round-tripping, produce Monday-to-Sunday windows clipped to today/race date, and count available training days excluding race day. In `profile.ts`, remove `weeksAvailable` and `preference`, add the new fields, validate goal hours `0–23` and minutes/seconds `0–59`, require a positive total goal time, and enforce the 24-week window limit while allowing shorter cycles. Keep boolean `adultConfirmed` out of numeric/string parsing helpers.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- --run src\domain\profile.test.ts src\domain\calendar.test.ts`
Expected: PASS, including invalid dates, short cycles, 24-week limit, and partial-week boundaries.

- [ ] **Step 5: Commit the profile/calendar change**

```powershell
git add src\domain\calendar.ts src\domain\profile.ts src\domain\profile.test.ts src\domain\calendar.test.ts
git commit -m "feat: add race date and goal profile fields" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Assess goal pace and ambition from the 5 km mark

**Files:**
- Modify: `src\domain\paces.ts`
- Test: `src\domain\paces.test.ts`

**Interfaces:**
- Produces `estimateRaceTimeSeconds(fiveKmTimeSeconds: number, targetDistanceKm: TargetDistanceKm): number`.
- Produces `assessRaceGoal(profile: RunnerProfile, paces: PaceTargets): GoalAssessment`.
- `GoalAssessment` contains `goalRacePaceSecondsPerKm`, `currentEquivalentRaceTimeSeconds`, `ambitious`, and `prescribedRacePaceSecondsPerKm`.
- The assessment uses `T2 = T1 * (D2 / 5) ** 1.06`, flags `goalTimeSeconds <= currentEquivalentRaceTimeSeconds * 0.95`, and uses `max(goalRacePaceSecondsPerKm, intervalSecondsPerKm)` as the prescribed pace cap.

- [ ] **Step 1: Write failing goal-assessment tests**

Add cases for exact 5 km equivalence, a 22:30 5 km result extrapolated to 10 km (2,815 seconds), just outside/at the 5% ambition boundary, a goal faster than current interval pace being capped, and existing 20:00/25:00 anchor clamping remaining unchanged.

- [ ] **Step 2: Run the pace tests and verify the new cases fail**

Run: `npm test -- --run src\domain\paces.test.ts`
Expected: FAIL because goal estimation and assessment exports do not exist.

- [ ] **Step 3: Implement goal estimation and assessment**

Add the Riegel estimate and goal assessment to `paces.ts`; keep `calculatePaces` and all existing anchor values and clamping behavior unchanged.

- [ ] **Step 4: Run the pace tests and verify they pass**

Run: `npm test -- --run src\domain\paces.test.ts`
Expected: PASS, including the 2,815-second 10 km reference and target-pace cap.

- [ ] **Step 5: Commit the goal-assessment change**

```powershell
git add src\domain\paces.ts src\domain\paces.test.ts
git commit -m "feat: assess race goals from five kilometer pace" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Generate a calendar-based periodized plan

**Files:**
- Modify: `src\domain\trainingPlan.ts`
- Test: `src\domain\trainingPlan.test.ts`

**Interfaces:**
- Adds `TrainingPhase = 'base' | 'development' | 'specific' | 'taper'`.
- Adds `phase`, `startDate`, and `endDate` to `TrainingWeek`.
- Changes `buildTrainingPlan` to `buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets, today: Date): TrainingPlan`.
- Consumes `getCalendarWeekWindows` from Task 1 and `assessRaceGoal` from Task 2.
- Adds a `race-pace` segment phase for specific blocks while retaining existing workout types.

- [ ] **Step 1: Write failing plan-generation tests**

Test a 12-week plan with Monday-based date ranges and exactly 3 base, 3 development, 5 specific, and 1 taper weeks; a 1–3-week plan that warns and does not increase volume to compensate; the 5% growth ceiling, 20% fourth-week recovery, and 60% peak taper; a goal warning and capped goal-pace segments; partial-week session counts excluding race day; zero training days on race day; and distance totals/session-count invariants for 1, 2, 4, and 7 sessions per week.

- [ ] **Step 2: Run the plan tests and verify the new cases fail**

Run: `npm test -- --run src\domain\trainingPlan.test.ts`
Expected: FAIL because the profile no longer has weeks/preference and plan weeks do not yet carry calendar phases.

- [ ] **Step 3: Implement phase assignment and calendar-aware progression**

Use the calendar windows from Task 1. For cycles of at least four weeks, assign `max(1, floor(weeks * 0.25))` base weeks, then `max(1, floor(weeks * 0.30))` development weeks, then specific weeks until the final taper week; keep taper last. For shorter cycles, use base weeks followed by taper and omit phases that cannot fit (a one-week cycle is taper only). Scale partial-week volume by available training days, cap partial-week sessions at available days, preserve the existing one-quality-session rule and distance distribution, and keep the race event out of workout totals. In specific-phase interval workouts, prescribe work segments at the capped goal pace; in progressive workouts, use the capped goal pace for the final segment. Add the `race-pace` segment phase for those blocks; retain existing paces for other sessions. Preserve existing distance-based and session-adaptation warnings and add the short-cycle/ambitious-goal warnings.

- [ ] **Step 4: Run the plan tests and verify they pass**

Run: `npm test -- --run src\domain\trainingPlan.test.ts`
Expected: PASS; weekly session distances sum to weekly totals, race day is excluded from session counts, and no short plan introduces compensatory growth.

- [ ] **Step 5: Commit the periodized plan**

```powershell
git add src\domain\trainingPlan.ts src\domain\trainingPlan.test.ts
git commit -m "feat: generate periodized race plans" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Replace form inputs and connect profile/assessment/plan

**Files:**
- Modify: `src\components\TrainingForm.tsx`
- Modify: `src\App.tsx`
- Modify: `src\components\TrainingPreview.tsx`
- Modify: `src\styles.css`
- Test: `src\App.test.tsx`

**Interfaces:**
- Form submission continues to call `onGenerate(profile: RunnerProfile)`.
- `App` calls `calculatePaces(profile.fiveKmTimeSeconds)`, computes BMI, and calls `buildTrainingPlan(profile, paces, today)`.
- `adultConfirmed` is optional for plan generation and controls only whether adult BMI guidance is eligible to display.

- [ ] **Step 1: Write failing UI tests**

Replace test helpers for week/preference fields with a future race date and goal H/M/S. Assert all five target distances remain, date and goal are required, cycles under four weeks can submit, preference controls are absent, adult confirmation is optional, and changing weight to BMI 30 shows adult guidance only when 18+ is confirmed.

- [ ] **Step 2: Run the App tests and verify the new cases fail**

Run: `npm test -- --run src\App.test.tsx`
Expected: FAIL because the form still asks for weeks/preference and the App uses the old profile fields.

- [ ] **Step 3: Implement the new form and App integration**

Add date input, goal-time fields, and an unchecked 18+ confirmation checkbox; remove the weeks and load-preference controls and their unused preference styles. Keep the existing distance, 5 km time, weight, height, weekly km, and sessions inputs. Generate the calendar plan with the current local date, preserve BMI numeric display, and gate only adult-specific BMI guidance in `TrainingPreview` on `adultConfirmed`.

- [ ] **Step 4: Run the App tests and verify they pass**

Run: `npm test -- --run src\App.test.tsx`
Expected: PASS, including form validation, BMI gating, date/goal display, and generated plan.

- [ ] **Step 5: Commit the form/App change**

```powershell
git add src\components\TrainingForm.tsx src\App.tsx src\styles.css src\App.test.tsx
git commit -m "feat: collect race date and finish time" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Consolidate workout preview and draw time/speed blocks

**Files:**
- Create: `src\domain\workoutText.ts`
- Modify: `src\components\TrainingPreview.tsx`
- Modify: `src\components\WorkoutTimeline.tsx`
- Modify: `src\styles.css`
- Test: `src\components\WorkoutTimeline.test.tsx`
- Test: `src\App.test.tsx`

**Interfaces:**
- Produces `formatCompleteWorkout(session: WorkoutSession): string`, joining structured segment labels in order.
- `WorkoutTimeline` continues to consume `segments: WorkoutSegment[]`; segment width uses `distanceKm * paceSecondsPerKm`, and height uses `3600 / paceSecondsPerKm` km/h on a fixed 0–20 km/h visual scale.
- `TrainingPreview` consumes the `TrainingWeek.phase/startDate/endDate` fields and `profile.raceDate`.

- [ ] **Step 1: Write failing preview/timeline tests**

Assert timeline widths are proportional to segment duration (including differing paces), bar heights are proportional to speed, `race-pace` segments have a legend label, and accessible text includes duration/speed. In App tests, assert there are no separate warm-up/cool-down columns, the single workout cell contains both phases in sequence, week date/phase are shown, and the race appears separately from sessions.

- [ ] **Step 2: Run the focused UI tests and verify the new cases fail**

Run: `npm test -- --run src\components\WorkoutTimeline.test.tsx src\App.test.tsx`
Expected: FAIL because width currently uses distance and the table has separate warm-up/cool-down columns.

- [ ] **Step 3: Implement complete workout text and timeline rendering**

Format each workout from `session.segments` so warm-up, work/recovery, and cool-down remain in order. Replace separate warm-up/cool-down table columns with one “Treino principal” column. Show week date range/phase and the race as a separate event. Render width from segment duration and height from speed, add the race-pace legend, retain accessible labels, and style the chart axes/labels without relying on color alone.

- [ ] **Step 4: Run the focused UI tests and verify they pass**

Run: `npm test -- --run src\components\WorkoutTimeline.test.tsx src\App.test.tsx`
Expected: PASS; chart data matches segments and the complete session text remains understandable without the visual.

- [ ] **Step 5: Commit the preview/timeline change**

```powershell
git add src\domain\workoutText.ts src\components\TrainingPreview.tsx src\components\WorkoutTimeline.tsx src\styles.css src\components\WorkoutTimeline.test.tsx src\App.test.tsx
git commit -m "feat: show complete workouts on a time speed timeline" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Update the XLSX workbook and verify end-to-end output

**Files:**
- Modify: `src\export\workbook.ts`
- Test: `src\export\workbook.test.ts`

**Interfaces:**
- Keep `createTrainingWorkbook(profile: RunnerProfile, paces: PaceTargets, bmi: number, plan: TrainingPlan): XLSX.WorkBook`.
- Reuse `formatCompleteWorkout(session)` from Task 5.

- [ ] **Step 1: Write failing workbook tests**

Round-trip the generated XLSX and assert summary includes goal time/date, cycle length, paces, BMI, alerts, and adult confirmation only when selected; assert old preference and separate warm-up/cool-down columns are absent; assert the weekly sheet includes date range/phase, complete workout text, and a separate race-date marker without an extra training row.

- [ ] **Step 2: Run workbook tests and verify the new cases fail**

Run: `npm test -- --run src\export\workbook.test.ts`
Expected: FAIL because the exporter references removed profile fields and separate workout columns.

- [ ] **Step 3: Implement workbook parity**

Update the summary and weekly sheet to the new profile and phase/date model. Reuse the full-workout formatter; gate BMI guidance on `adultConfirmed`; keep numeric distance cells and sheet names stable; include the race as summary/event information, not as a session; do not embed the web timeline.

- [ ] **Step 4: Run workbook tests and verify they pass**

Run: `npm test -- --run src\export\workbook.test.ts`
Expected: PASS after XLSX write/read round-trip, with no legacy preference or split phase columns.

- [ ] **Step 5: Commit the workbook change**

```powershell
git add src\export\workbook.ts src\export\workbook.test.ts
git commit -m "feat: export goal based training plans" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 7: Run the complete verification suite

**Files:**
- No source changes unless a verification failure exposes a regression.

**Interfaces:**
- Verifies the integrated profile, goal assessment, training plan, preview, and workbook.

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`
Expected: all Vitest tests pass.

- [ ] **Step 2: Run typecheck and production build**

Run: `npm run build`
Expected: TypeScript completes without errors and Vite emits a production build suitable for the existing GitHub Pages deployment.

- [ ] **Step 3: Run the build-output check**

Run: `npm run check:build`
Expected: the repository build check passes.

- [ ] **Step 4: Verify the local app is available for user testing**

Reuse the current Vite server if it is already running; otherwise start `npm run dev -- --host 127.0.0.1`. Verify `http://127.0.0.1:5173/` responds with HTTP 200 and leave the dev server available for the user.

- [ ] **Step 5: Commit any verification-only fixes**

Only if a focused fix was needed, add the affected source/tests and commit with an appropriate `fix:` message plus the required co-author trailer; otherwise, make no extra commit.
