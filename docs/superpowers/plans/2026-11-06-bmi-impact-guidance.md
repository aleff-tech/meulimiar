# IMC Impact Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show cautious BMI-related impact guidance in the generated-plan preview and XLSX without changing training plans.

**Architecture:** Add one shared domain helper that returns the guidance for a displayed BMI of at least 30, or `null` below the threshold. Reuse its exact text in the React preview and workbook summary.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, XLSX.

**Spec:** `docs/superpowers/specs/2026-11-06-bmi-impact-guidance-design.md`

## Global Constraints

- BMI is informational and does not change workouts, paces, or volume.
- BMI ≥ 30 is described as a possible obesity range for adults, not as a diagnosis or an individual injury-risk measure.
- The same conditional guidance appears in the preview and XLSX.
- The guidance recommends effort lighter than indicated, conservative progression, and professional support without promising injury prevention; it notes that BMI interpretation differs for people under 18.

## Review Focus

- At the boundary, displayed BMI 30 must show guidance; test in `bmi.test.ts`.
- A displayed BMI below 30 must not show guidance; test in `bmi.test.ts` and assert no notice in the preview and XLSX.
- A BMI above the threshold must reuse the same guidance; test in `bmi.test.ts`.
- The guidance must state that BMI interpretation differs for people under 18; assert this in `bmi.test.ts`.
- A high BMI must not alter generated paces or sessions, and both output formats must use the shared wording; test in `App.test.tsx` and `workbook.test.ts`.

---

### Task 1: Add conditional BMI guidance to the preview and workbook

**Files:**
- Modify: `src/domain/bmi.ts`
- Test: `src/domain/bmi.test.ts`
- Modify: `src/components/TrainingPreview.tsx`
- Test: `src/App.test.tsx`
- Modify: `src/export/workbook.ts`
- Test: `src/export/workbook.test.ts`

**Interfaces:**
- Consumes: `calculateBmi(weightKg: number, heightCm: number): number`, whose return value is rounded to one decimal place.
- Produces: `getBmiTrainingGuidance(bmi: number): string | null` in `src/domain/bmi.ts`; return the shared guidance for `bmi >= 30`, otherwise `null`.
- The preview and workbook both call `getBmiTrainingGuidance`; the workbook adds an `Aviso sobre IMC` summary row only when it returns a string.

- [ ] **Step 1: Add domain tests for the guidance threshold and wording**

In `src/domain/bmi.test.ts`, test that `getBmiTrainingGuidance(30)` returns non-null guidance, `getBmiTrainingGuidance(29.9)` returns `null`, and `getBmiTrainingGuidance(32.7)` returns the same guidance as at 30. Assert the guidance mentions adults, that BMI is not a diagnosis or isolated injury-risk measure, effort lighter than indicated, conservative progression, lower-impact training, professional guidance, no automatic plan adjustment, and different interpretation under age 18.

- [ ] **Step 2: Run the domain test and verify it fails**

Run: `npm test -- --run src/domain/bmi.test.ts`
Expected: FAIL because `getBmiTrainingGuidance` is not implemented.

- [ ] **Step 3: Implement `getBmiTrainingGuidance(bmi: number): string | null` in `src/domain/bmi.ts`**

Return one shared Portuguese message for BMI ≥ 30 and `null` otherwise. Keep `calculateBmi` behavior unchanged.

- [ ] **Step 4: Run the domain test and verify it passes**

Run: `npm test -- --run src/domain/bmi.test.ts`
Expected: PASS.

- [ ] **Step 5: Add preview integration tests**

In `src/App.test.tsx`, add a case that generates a plan at BMI 32.7 and verifies the guidance is visible, and that changing only weight from the existing valid profile leaves the pace cards and weekly-plan table unchanged. Also verify the existing normal-BMI case has no BMI guidance.

- [ ] **Step 6: Add workbook tests**

In `src/export/workbook.test.ts`, verify BMI 30 adds `['Aviso sobre IMC', guidance]` to the summary and BMI 29.9 adds no such row. Read the expected `guidance` from `getBmiTrainingGuidance` so this test enforces shared wording.

- [ ] **Step 7: Run the integration tests and verify they fail**

Run: `npm test -- --run src/App.test.tsx src/export/workbook.test.ts`
Expected: FAIL because neither output currently includes BMI guidance.

- [ ] **Step 8: Integrate the shared guidance in the preview and XLSX**

In `src/components/TrainingPreview.tsx`, render the returned message as a notice when non-null. In `src/export/workbook.ts`, append the same message as an `Aviso sobre IMC` summary row when non-null; do not change plan generation or session rows.

- [ ] **Step 9: Run the focused integration tests**

Run: `npm test -- --run src/domain/bmi.test.ts src/App.test.tsx src/export/workbook.test.ts`
Expected: PASS, including threshold, output parity, and unchanged plan assertions.

- [ ] **Step 10: Run the complete verification suite**

Run: `npm test -- --run`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: TypeScript exits successfully.

Run: `npm run build`
Expected: TypeScript and Vite production build succeed.
