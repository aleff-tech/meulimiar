# Target-Aware Training Plan Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce training-load limits after rounding and make session distances reflect the selected race distance without increasing weekly load beyond the existing caps.

**Architecture:** Keep `buildTrainingPlan` as the domain entry point and preserve weekly progression, workout types, and paces. Use 0.01 km precision throughout weekly totals, session allocation, UI, and XLSX; allocate target-dependent shares to long runs and report when the cycle does not reach the agreed long-run threshold.

**Tech Stack:** TypeScript, React, Vitest, React Testing Library, SheetJS.

**Spec:** `docs\\superpowers\\specs\\2026-11-06-plan-safety-review-design.md`

## Global Constraints

- Preserve the 5% light and 8% aggressive weekly build caps.
- Preserve the 20% recovery cutback and final week at no more than 60% of the preceding peak.
- Allocate 20%, 25%, 30%, 35%, or 40% of weekly volume to long runs for 3 km, 5 km, 10 km, 21.1 km, or 42.2 km, respectively.
- Warn when the longest planned long run is below 75% of the target; with one weekly session, explicitly warn that no long run is scheduled.
- Do not increase mileage to clear a warning; BMI remains informational and does not affect training.
- Use 0.01 km precision and keep displayed session distances equal to the displayed weekly total.

## Review Focus

- **Low starting volume:** From 1.00 km/week, displayed light and aggressive build weeks must not exceed 5% and 8%; verify both.
- **Recovery boundaries:** Rounded cutbacks remain at or below 80% of the preceding peak, and the final week remains at or below 60%.
- **Session-count edge cases:** 1, 2, and 7 sessions keep nonnegative session distances whose exact 0.01 km sum equals the weekly total.
- **Target differentiation:** All five target distances receive the specified long-run shares; insufficient maximum long runs and the one-session schedule produce explicit warnings.
- **User-visible precision:** A 1.05 km session renders as `1,05 km` and remains numeric with a `0.00` format in the XLSX calendar.

---

### Task 1: Enforcing safe, target-aware distance planning

**Files:**
- Modify: `src\\domain\\trainingPlan.ts`
- Test: `src\\domain\\trainingPlan.test.ts`
- Modify: `src\\components\\TrainingPreview.tsx`
- Test: `src\\App.test.tsx`
- Modify: `src\\export\\workbook.ts`
- Test: `src\\export\\workbook.test.ts`
- Modify: `docs\\superpowers\\plans\\2026-11-06-gerador-planilhas-treino.md`

**Interfaces:**
- Preserve `buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets): TrainingPlan`.
- Preserve `TrainingPlan.warnings: string[]`; add a warning for insufficient long-run distance without removing the short-cycle warning.
- Preserve numeric XLSX distances while formatting calendar distance cells to two decimal places.

- [x] **Step 1: Add failing tests** across `trainingPlan.test.ts`, `App.test.tsx`, and `workbook.test.ts` for 0.01 km progression from a 1.00 km base in both preferences, the 20% cutback and 60% taper after rounding, exact session-sum invariants at 1/2/7 sessions, the five target long-run shares, the 75% and one-session warnings, and two-decimal UI/XLSX distance formatting.
- [x] **Step 2: Run `npm test -- --run src/domain/trainingPlan.test.ts src/App.test.tsx src/export/workbook.test.ts` and confirm the new assertions fail against current behavior.**
- [x] **Step 3: Implement 0.01 km-safe rounding and target allocation** in `trainingPlan.ts`. Round build, cutback, taper, and session allocations so caps are never exceeded; use a fixed 20% quality share when a quality session exists and divide the remaining weekly distance between the target-specific long share and easy sessions. Keep one-session weeks easy-only.
- [x] **Step 4: Add target readiness warnings** using the maximum scheduled `long` session across the cycle; warn below 75% of target distance, and explicitly report that no long run is scheduled for a one-session week. Keep short-cycle warnings intact.
- [x] **Step 5: Run the domain tests and verify** all new load, target-share, warning, and session-sum assertions pass.
- [x] **Step 6: Update visible precision and XLSX formatting.** Show two decimal places in `TrainingPreview`; keep calendar distances numeric and apply `0.00` number formatting to XLSX distance cells. Verify the tests from Step 1 pass.
- [x] **Step 7: Update the original implementation plan** so its distance precision requirement says 0.01 km and points to this correction design.
- [x] **Step 8: Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `npm run check:build`; verify all succeed.**
- [x] **Step 9: Commit** with message `fix: respect training load caps and target distance`.

### Task 2: Addressing final-review findings

- [x] Export the clamped-pace warning with the workbook summary and verify it after an XLSX round-trip.
- [x] Round the long-run share down to 0.01 km and assign distribution remainder to an easy session.
- [x] Clarify the one-session warning and revalidate the time group after edits.
- [x] Run the test suite before deploying from the GitHub Pages workflow.
- [x] Verify focused and full tests, typecheck, production build, and the Pages build check.
- [x] Commit review fixes with message `fix: address training plan review findings`.
