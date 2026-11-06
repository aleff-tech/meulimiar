# Rotating Running Workouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate rotating, structured running sessions with easy-run warm-ups and cool-downs contained inside the existing weekly distance.

**Architecture:** Keep `buildTrainingPlan` as the domain entry point. Extend its session model with quality subtypes and phase distances/times, preserve weekly mileage caps, and render the same session details in the preview and XLSX.

**Tech Stack:** TypeScript, React, Vitest, React Testing Library, SheetJS.

**Spec:** `docs/superpowers/specs/2026-11-06-training-types-and-phases-design.md`

## Global Constraints

- Keep the existing weekly build, recovery, taper, 0.01 km precision, and target-specific long-run shares.
- Rotate one quality session per week in this order: threshold, intervals, fartlek, progressive.
- Place the first easy session immediately after the quality session; keep sessions numbered without assigning weekdays.
- Use 5 minutes for easy/long warm-up and cool-down targets, and 10 minutes for quality warm-up and 5 minutes for quality cool-down.
- Keep all warm-up, recovery, and cool-down running inside the allocated session and weekly distances.
- Make a quality session easy when its allocation cannot fit both target phases and at least 1.00 km of main work; add a warning and do not increase volume.
- For easy/long sessions too short to fit both target phases, scale both phases proportionally so they use no more than half of the session distance.

## Review Focus

- **Low-volume sessions:** Confirm scaled easy phases remain within the session total and a too-small quality allocation becomes easy with a warning.
- **Weekly target shares after reordering:** Confirm 2, 3, 4, and 7-session schedules still sum exactly and preserve the long-run share.
- **Quality rotation:** Confirm an 8-week plan rotates all four subtypes through recovery and taper weeks without creating more than one quality session.
- **Pace and workout structure:** Confirm easy phases use the easy pace; progressive middle effort is the rounded midpoint of easy and threshold, faster work does not exceed interval pace, and subtype instructions fit the allocated main distance.
- **Workbook round-trip:** Confirm phase times, descriptions, subtype labels, and numeric total distances survive XLSX export/reopen.

## Implementation Calls

- These main-set templates and repeat sizes are conservative product choices, not prescriptions stated by the Olympics.com article: threshold blocks of 2–5 minutes with 1–2 minutes easy recovery; 200–400 m intervals with easy recovery; fartlek alternating 1 minute faster and 1 minute easy; progressive work split 40%/40%/20%.
- Progressive middle pace is the nearest whole second to the midpoint of the easy and threshold paces. The final segment uses threshold pace; no work exceeds the interval pace.
- The 1.00 km minimum main-work distance is the fallback threshold; quality is replaced with easy work below it rather than increasing weekly volume.

---

### Task 1: Rotating quality sessions and partitioning weekly volume

**Files:**
- Modify: `src/domain/trainingPlan.ts`
- Test: `src/domain/trainingPlan.test.ts`

**Interfaces:**
- Consumes: `buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets): TrainingPlan`.
- Produces:
  - `QualityWorkoutType = 'threshold' | 'interval' | 'fartlek' | 'progressive'`.
  - Extend `WorkoutSession` with `qualityType?: QualityWorkoutType`, `warmupDistanceKm: number`, `warmupDurationSeconds: number`, `mainDistanceKm: number`, `cooldownDistanceKm: number`, and `cooldownDurationSeconds: number`. Preserve `distanceKm` as the complete session distance and preserve the existing `type`, `paceSecondsPerKm`, and `description` properties.
  - `TrainingPlan.warnings` includes explicit warnings when easy phases are shortened or a quality session is changed to easy.

- [ ] **Step 1: Write failing domain tests** in `trainingPlan.test.ts`:
  - `rotates quality subtypes through an 8-week plan including recovery and taper weeks`
  - `places an easy recovery session immediately after quality`
  - `preserves weekly totals and long-run shares after changing session order`
  - `partitions an ordinary quality session into 10-minute warm-up, main work, and 5-minute cool-down`
  - `uses easy and long phase durations within one second of their 5-minute targets`
  - `scales easy phases when a short session cannot fit the phase targets`
  - `changes an ineligible quality session to easy without increasing its allocated distance`
  - `uses easy pace for phases, threshold pace for threshold work, and interval pace only for faster work`
  - `uses the rounded easy-threshold midpoint only for the progressive middle segment`
  - `keeps one- and two-session plans quality-free while adding phases to every feasible session`
  - Assert phase distances sum to `distanceKm` at 0.01 km precision and weekly session distances sum to `weeklyDistanceKm`.
- [ ] **Step 2: Run `npm test -- --run src\domain\trainingPlan.test.ts` and confirm** the new tests fail against the current generic quality-session behavior.
- [ ] **Step 3: Implement typed weekly scheduling** in `trainingPlan.ts`. Rotate subtypes by plan week in the global order; order sessions as quality, first easy, long, then remaining easy sessions. Keep one- and two-session plans quality-free. Allocate shares by session type rather than array position so reordering preserves the existing 20% quality share, target-specific long-run share, and easy remainder. Use threshold pace for threshold work, interval pace for intervals/fartlek, and for progressive work use easy pace, the rounded midpoint of easy and threshold, then threshold; never use a faster pace.
- [ ] **Step 4: Implement phase partitioning and low-volume fallback** in `trainingPlan.ts`. Convert target phase times to easy-pace distances, floor phase distances to 0.01 km, assign the remainder to main work, and preserve the exact session total. Scale easy/long phases proportionally to at most half the allocated distance when needed. Build 2–5 minute threshold blocks with 1–2 minute easy recoveries, 200–400 m interval repetitions with easy recoveries, and 1-minute fartlek changes with easy running to fit `mainDistanceKm`; split progressive main distance 40%/40%/20% at easy/midpoint/threshold. Replace quality with easy when the target phases plus 1.00 km of main work do not fit, and add an explicit plan warning.
- [ ] **Step 5: Run `npm test -- --run src\domain\trainingPlan.test.ts` and verify** rotation, ordering, existing target shares, phase-time targets, fallback warnings, and exact distance sums.
- [ ] **Step 6: Commit** the domain model and generation changes with message `feat: structure rotating running workouts`.

### Task 2: Showing workout phases in the preview and XLSX

**Files:**
- Create: `src/domain/time.ts`
- Test: `src/domain/time.test.ts`
- Modify: `src/components/TrainingPreview.tsx`
- Test: `src/App.test.tsx`
- Modify: `src/export/workbook.ts`
- Test: `src/export/workbook.test.ts`

**Interfaces:**
- Consumes: Task 1's `WorkoutSession` phase fields and `QualityWorkoutType`.
- Produces: `formatDuration(seconds: number): string`, formatted as `mm:ss`, for phase times in both UI and workbook.

- [ ] **Step 1: Write failing tests**:
  - `formatDuration` returns `05:00`, `10:00`, and the actual `mm:ss` represented by a rounded phase distance.
  - The preview shows each phase time, easy effort for warm-up/cool-down, the quality subtype, and the session's main-work description.
  - The preview orders the recovery easy session immediately after the quality session and exposes the fallback warning.
  - XLSX round-trip retains phase-time cells, subtype/main-work text, and numeric session-total distances.
- [ ] **Step 2: Run `npm test -- --run src\domain\time.test.ts src\App.test.tsx src\export\workbook.test.ts` and confirm** the new assertions fail because phase details are not yet displayed or exported.
- [ ] **Step 3: Implement `formatDuration(seconds: number): string`** in `src/domain/time.ts`, returning zero-padded minutes and seconds; add unit coverage for exact and non-whole-minute durations.
- [ ] **Step 4: Render the new session fields** in `TrainingPreview.tsx`. Keep the overall distance and pace visible, and add explicit warm-up, main-work, and cool-down details using the shared duration formatter and existing easy pace.
- [ ] **Step 5: Export the new session fields** in `workbook.ts`. Add readable warm-up, main-work, and cool-down columns while keeping the total session distance numeric and formatted to two decimal places.
- [ ] **Step 6: Run the focused UI, time-formatting, and workbook tests** and verify all phase details survive display and XLSX round-trip.
- [ ] **Step 7: Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `npm run check:build`; verify** all pass and the build remains suitable for GitHub Pages.
- [ ] **Step 8: Commit** the preview, export, and tests with message `feat: show workout phases in preview and export`.
