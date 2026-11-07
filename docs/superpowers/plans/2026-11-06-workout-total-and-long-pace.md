# Workout Total and Long-Run Pace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefix every complete workout with its total distance and include the prescribed pace in long-run summaries.

**Architecture:** Extend the existing `formatCompleteWorkout(session: WorkoutSession): string` helper and keep it as the single source for the preview and XLSX. Use the existing `formatPace` helper for long-run pace and preserve all segment labels in their current order.

**Tech Stack:** TypeScript, React, Vitest, XLSX.

**Spec:** `docs/superpowers/specs/2026-11-06-workout-total-and-long-pace-design.md`

## Global Constraints

- “Format distance in `pt-BR` with two decimal places and pace through the existing `formatPace` helper.”
- “Long-run summary must contain the complete session distance and an explicit pace such as `6:40 min/km`; other workout types must not imply a single overall pace.”
- “Keep all generated segment details in their current order.”
- “Apply the same formatted text in the web preview and XLSX.”
- Do not change workout distances, training paces, periodization, or how the total is calculated.

## Review Focus

- All session types show `session.distanceKm`, including warm-up and cool-down; pin this in the formatter tests.
- Long-run summaries show the prescribed session pace; pin the exact `4,75 km a 6:40 min/km` summary in the formatter tests.
- Quality workouts have multiple paces and must not imply one overall pace; pin an exact quality summary and retained segment labels in the formatter tests.
- Easy sessions receive a distance summary without a single-pace summary; cover this alongside quality in the formatter tests.
- The XLSX uses the same long-run summary as the shared formatter; assert the complete long-session cell in the workbook test.

---

### Task 1: Format complete workout summaries

**Files:**
- Modify: `src/domain/workoutText.ts`
- Create: `src/domain/workoutText.test.ts`
- Modify: `src/export/workbook.test.ts`

**Interfaces:**
- Consumes: `WorkoutSession` from `src/domain/trainingPlan.ts`; `formatPace(secondsPerKm: number): string` from `src/domain/paces.ts`.
- Produces: `formatCompleteWorkout(session: WorkoutSession): string`, consumed by both `src/components/TrainingPreview.tsx` and `src/export/workbook.ts`.

- [ ] **Step 1: Write formatter tests**

Add focused tests with complete session fixtures:
- A long session with `distanceKm: 4.75`, `paceSecondsPerKm: 400`, and warm-up, main, and cool-down segments formats the prefix as `4,75 km a 6:40 min/km` and retains segment labels in order.
- Easy and quality sessions include their two-decimal total distance but no overall-pace summary; quality segment labels retain their distinct paces and order.

- [ ] **Step 2: Run the focused formatter tests and verify they fail**

Run: `npm test -- --run src/domain/workoutText.test.ts`
Expected: FAIL because the current formatter only joins segment labels.

- [ ] **Step 3: Implement the shared summary**

In `src/domain/workoutText.ts`, format `session.distanceKm` with `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`; prepend `<distance> km` for every session and append ` a <pace> min/km` only when `session.type === 'long'`, using `formatPace(session.paceSecondsPerKm)`. Append the existing segment labels in their current order.

- [ ] **Step 4: Verify formatter tests**

Run: `npm test -- --run src/domain/workoutText.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the workbook uses the shared long-run summary**

Extend `src/export/workbook.test.ts` to assert that a long-run “Treino completo” cell includes the total-distance-and-pace prefix produced by the formatter, while retaining the existing quality-workout assertion.

Run: `npm test -- --run src/export/workbook.test.ts`
Expected: PASS, including the XLSX round-trip assertions.

- [ ] **Step 6: Run the build checks**

Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.
