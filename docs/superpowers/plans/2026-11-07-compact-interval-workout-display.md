# Compact Interval Workout Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repetitive interval segment text with a concise summary that preserves exact work/recovery counts and every distance and pace.

**Architecture:** Keep `WorkoutSession` and generated segments unchanged. Extend `formatCompleteWorkout(session: WorkoutSession): string` to compact only interval sessions; its existing consumers keep preview and XLSX consistent.

**Tech Stack:** TypeScript, React, Vitest, XLSX.

**Spec:** `docs/superpowers/specs/2026-11-07-compact-interval-workout-display-design.md`

## Global Constraints

- “Compact only sessions with `qualityType === 'interval'`.”
- “Keep the total session distance and every segment's distance and pace represented.”
- “Show work and recovery counts separately, e.g. `15x Tiros` and `14x Recup`, to reflect the generated session exactly.”
- “Keep any `Leve extra` as its own item before the cool-down.”
- “Preserve the generated order and represent every segment, including a `Leve extra`.”
- “Keep the preview and workbook text identical.”
- “Do not change interval generation, repetitions, paces, distances, or timeline rendering.”
- “Keep segment distances in their existing two-decimal format and include `min/km` with every displayed pace.”

## Review Focus

- A session with 15 work segments and 14 recoveries must display separate exact counts; test the complete expected summary.
- A `Leve extra` equal in pace/distance to a recovery still appears separately before cool-down; assert the exact text.
- Specific-phase intervals use `race-pace` segments and must retain “Ritmo de prova” rather than being mislabeled “Tiros”; assert the compact output.
- An interval session with no recovery segments must not produce a `0x Recup` item; test the one-repetition case.
- A representative threshold workout stays unchanged; compare its exact text, alongside existing easy/long formatter tests.

---

### Task 1: Compact interval session text

**Files:**
- Modify: `src/domain/workoutText.ts`
- Modify: `src/domain/workoutText.test.ts`
- Modify: `src/export/workbook.test.ts`

**Interfaces:**
- Consumes: `WorkoutSession` and `WorkoutSegment` from `src/domain/trainingPlan.ts`; `formatPace(secondsPerKm: number): string` from `src/domain/paces.ts`.
- Produces: `formatCompleteWorkout(session: WorkoutSession): string`, still used by `TrainingPreview` and workbook export.

- [ ] **Step 1: Write focused failing formatter tests**

Add complete interval session fixtures to `src/domain/workoutText.test.ts`:
- For 1.50 km warm-up, 15 work segments of 0.20 km, 14 recovery segments of 0.15 km, a 0.30 km easy extra, and 0.75 km cool-down, assert the exact compact result:
  `7,65 km · Aquec: 1.50 km (6:40 min/km) · 15x Tiros: 0.20 km (4:50 min/km) · 14x Recup: 0.15 km (6:40 min/km) · Leve extra: 0.30 km (6:40 min/km) · Desaquec: 0.75 km (6:40 min/km)`.
- Assert that a single-work interval has no `0x Recup`.
- Assert that interval work segments with phase `race-pace` are labeled `Ritmo de prova`.
- Assert that a representative non-interval quality session retains its existing complete-workout text.

- [ ] **Step 2: Run the formatter tests and verify they fail**

Run: `npm test -- --run src/domain/workoutText.test.ts`
Expected: FAIL because interval sessions currently print each segment label separately.

- [ ] **Step 3: Implement compact interval formatting**

In `src/domain/workoutText.ts`, keep the existing result for non-interval sessions. For `qualityType === 'interval'`, compact the repeated loop into separate work and recovery count summaries in work-then-recovery order; group only matching phase, label, distance, and pace. Keep warm-up first, unmatched segments such as `Leve extra` in their generated position, and cool-down last. Label `race-pace` work as `Ritmo de prova`, not `Tiros`. Preserve the total distance prefix, use `formatPace`, and retain the existing two-decimal segment distance convention.

- [ ] **Step 4: Verify formatter tests**

Run: `npm test -- --run src/domain/workoutText.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the XLSX contains the same compact interval text**

Extend `src/export/workbook.test.ts` to find an interval session in the generated plan and assert that its “Treino completo” cell equals `formatCompleteWorkout(session)` and contains separate `x Tiros` and `x Recup` counts.

Run: `npm test -- --run src/export/workbook.test.ts`
Expected: PASS, including XLSX round-trip assertions.

- [ ] **Step 6: Run the full suite and production build**

Run: `npm test -- --run`
Expected: All tests pass.

Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.
