# Gerador de Planilhas de Corrida Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive GitHub Pages app that creates a personalized running plan and downloads it as an XLSX workbook.

**Architecture:** A single-page React app collects and validates runner inputs, then calls independent TypeScript domain functions for pace calculations and plan generation. The app previews the result and creates a two-sheet XLSX entirely in the browser; GitHub Actions publishes the static Vite build.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, SheetJS (`xlsx`), GitHub Pages Actions.

**Spec:** `docs\superpowers\specs\2026-11-06-gerador-planilhas-treino-design.md`

## Global Constraints

- Use the five target distances: 3 km, 5 km, 10 km, 21,1 km e 42,2 km.
- Use the three 5 km reference marks and easy/threshold/interval paces exactly as listed in the spec.
- Interpolate paces linearly; outside the 20:00–25:00 reference range, clamp to the nearest pace anchor and show a warning.
- Keep the page static, process data in the browser, and do not persist runner data.
- Calculate BMI from kg and cm and display it as informational only; never use it to prescribe training.
- Generate an XLSX with a summary sheet and a complete weekly-calendar sheet, in Brazilian Portuguese.
- Show conservative-load and short-cycle warnings; an aggressive preference must not override safety limits.
- Use a relative Vite base path so the build works under a GitHub Pages project path.
- Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` in every commit.

## Review Focus

- **Reference boundary and interpolation times:** exact anchors, midpoint, and times just outside the supported range; test in Task 2.
- **Malformed or empty time and profile fields:** reject invalid h:m:s and out-of-range values without producing a plan; test in Task 2.
- **Small or short training base:** one/two weekly sessions, low current volume, and insufficient weeks for the target; test in Task 3.
- **BMI dimensions and display:** centimeters must be converted to meters, with no training effect; test in Tasks 2 and 4.
- **Static deployment and workbook usability:** project-path asset URLs and XLSX sheet names/content; test in Tasks 5 and 6.

---

### Task 1: Creating the Vite and test foundation

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`
- Create: `src\main.tsx`, `src\test\setup.ts`, `src\test\smoke.test.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces `npm run dev`, `npm run build`, `npm run typecheck`, and `npm test -- --run`.
- The React root mounts from `#root`; Vite uses `base: './'`.

- [ ] **Step 1: Add a smoke test** asserting the test environment can render a React element and that the app root exists.
- [ ] **Step 2: Configure Vite, React, TypeScript, Vitest/jsdom, and React Testing Library; install `xlsx` for the browser export tasks.**
- [ ] **Step 3: Run `npm test -- --run` and verify the smoke test passes.**
- [ ] **Step 4: Run `npm run build` and `npm run typecheck`; verify both exit successfully.**
- [ ] **Step 5: Commit the scaffold** with message `chore: scaffold running plan app`.

### Task 2: Implementing profile validation and running metrics

**Files:**
- Create: `src\domain\profile.ts`, `src\domain\profile.test.ts`
- Create: `src\domain\paces.ts`, `src\domain\paces.test.ts`
- Create: `src\domain\bmi.ts`, `src\domain\bmi.test.ts`

**Interfaces:**
- `RunnerFormValues`: form strings for target distance, 5 km hours/minutes/seconds, weight, height, weekly km, weekly sessions, weeks available, and preference.
- `RunnerProfile`: parsed numeric values, including `fiveKmTimeSeconds`, `weightKg`, `heightCm`, `currentWeeklyKm`, `sessionsPerWeek`, and `weeksAvailable`.
- `parseRunnerProfile(values: RunnerFormValues): ProfileParseResult`, where `ProfileParseResult` is a discriminated `{ ok: true; value: RunnerProfile } | { ok: false; errors: ProfileErrors }`.
- `PaceTargets`: `easySecondsPerKm`, `thresholdSecondsPerKm`, `intervalSecondsPerKm`, and `clamped`.
- `calculatePaces(fiveKmTimeSeconds: number): PaceTargets`; `formatPace(secondsPerKm: number): string`.
- `calculateBmi(weightKg: number, heightCm: number): number`.

- [ ] **Step 1: Write failing tests** for the three exact pace anchors, the 21:15 midpoint (`5:40`, `4:30`, `4:10`), clamping just outside 20:00–25:00, pace formatting, BMI `70 kg / 175 cm = 22.9`, and invalid profile/time fields.
- [ ] **Step 2: Run `npm test -- --run src/domain` and confirm the new tests fail because the domain functions are not implemented.**
- [ ] **Step 3: Implement typed profile parsing and field errors.** Accept target distances `3`, `5`, `10`, `21.1`, `42.2`; 5 km times from 00:01:00 through 02:00:00; weight 20–250 kg; height 100–250 cm; current weekly volume 1–250 km; 1–7 sessions; and 4–24 weeks. Reject blanks, non-finite numbers, and invalid h:m:s components.
- [ ] **Step 4: Implement piecewise linear pace interpolation using the exact spec anchors, round to the nearest second, clamp outside the anchors, and return a `clamped` flag. Implement BMI to one decimal place without classifying it.**
- [ ] **Step 5: Run `npm test -- --run src/domain` and verify all profile, pace, and BMI tests pass.**
- [ ] **Step 6: Commit** with message `feat: add running profile metrics`.

### Task 3: Generating a conservative weekly training plan

**Files:**
- Create: `src\domain\trainingPlan.ts`, `src\domain\trainingPlan.test.ts`

**Interfaces:**
- Consumes `RunnerProfile` and `PaceTargets` from Task 2.
- `WorkoutSession`: `week`, `session`, `type` (`easy | quality | long`), `distanceKm`, `paceSecondsPerKm`, and a Portuguese `description`.
- `TrainingPlan`: `weeks: TrainingWeek[]` and `warnings: string[]`; each `TrainingWeek` has `week`, `weeklyDistanceKm`, and `sessions`.
- `buildTrainingPlan(profile: RunnerProfile, paces: PaceTargets): TrainingPlan`.

- [ ] **Step 1: Write failing tests** for deterministic week/session counts, weekly volume progression, recovery and taper weeks, short-cycle warnings for every target distance, a 1 km/week starting base, and identical plans when only weight/height change.
- [ ] **Step 2: Run `npm test -- --run src/domain/trainingPlan.test.ts` and confirm it fails before implementation.**
- [ ] **Step 3: Implement the deterministic schedule.** Week 1 starts at the entered weekly km. Light plans increase build weeks by at most 5%; aggressive plans by at most 8%. The selected cycle length determines how many build/recovery weeks fit; a shorter cycle is more concentrated but must not exceed the same growth cap. Every fourth non-final week is a 20% cutback from the preceding peak; the final week is at most 60% of the preceding peak. Keep weekly session count equal to the selected frequency. With one session, schedule easy running only; with two, schedule easy plus long-easy; with three or more, schedule one quality session, one long-easy session, and easy sessions for the remainder. Never schedule more than one quality session per week. Use the easy pace for easy/long runs and alternate threshold/interval quality for 3/5/10 km; use threshold quality for the half and full marathon. Round distances to 0.1 km and preserve the weekly total. Weight and height must not affect the schedule.
- [ ] **Step 4: Add a warning when the selected cycle is shorter than 6 weeks for 3/5 km, 8 for 10 km, 12 for the half marathon, or 16 for the marathon. Keep the warning even when the aggressive preference is selected.**
- [ ] **Step 5: Run `npm test -- --run src/domain/trainingPlan.test.ts` and verify all schedule and safety tests pass.**
- [ ] **Step 6: Commit** with message `feat: generate conservative running plans`.

### Task 4: Building the single-page form and plan preview

**Files:**
- Create: `src\App.tsx`, `src\App.test.tsx`, `src\components\TrainingForm.tsx`, `src\components\TrainingPreview.tsx`, `src\styles.css`
- Modify: `src\main.tsx`

**Interfaces:**
- `TrainingForm` receives `onGenerate(profile: RunnerProfile): void` and renders accessible inputs/errors.
- `TrainingPreview` receives `profile`, `paces`, `bmi`, and `plan`, and renders the plan summary and weekly sessions.
- `App` owns the parsed profile and generated plan state; invalid input never reaches `buildTrainingPlan`.

- [ ] **Step 1: Write failing component tests** for selecting each target, entering the 5 km time in three h:m:s fields, validating errors, calculating informational BMI, showing a clamped-pace warning, and rendering an available training plan.
- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx` and confirm the tests fail before the UI exists.**
- [ ] **Step 3: Implement the one-page responsive form** with target, time, weight, height, current weekly km, sessions/week, available weeks, and light/aggressive preference. Show the BMI only when weight and height are valid.
- [ ] **Step 4: Connect form submission to `parseRunnerProfile`, `calculatePaces`, `calculateBmi`, and `buildTrainingPlan`; render validation and short-cycle/clamped-range warnings explicitly.**
- [ ] **Step 5: Render a preview of the paces and week-by-week sessions; include the non-medical guidance and do not persist form data.**
- [ ] **Step 6: Run `npm test -- --run src/App.test.tsx` and verify all component tests pass.**
- [ ] **Step 7: Commit** with message `feat: add running plan form and preview`.

### Task 5: Exporting and downloading the XLSX workbook

**Files:**
- Create: `src\export\workbook.ts`, `src\export\workbook.test.ts`
- Modify: `src\App.tsx`, `src\App.test.tsx`

**Interfaces:**
- `createTrainingWorkbook(profile: RunnerProfile, paces: PaceTargets, bmi: number, plan: TrainingPlan): XLSX.WorkBook`.
- `downloadTrainingWorkbook(workbook: XLSX.WorkBook): void`, saving `planilha-de-corrida.xlsx`.

- [ ] **Step 1: Write failing workbook tests** that inspect a generated workbook and assert the two Portuguese sheet names, runner summary, BMI, pace values, all weeks, and workout rows.
- [ ] **Step 2: Run `npm test -- --run src/export/workbook.test.ts` and confirm the tests fail before the exporter exists.**
- [ ] **Step 3: Implement `createTrainingWorkbook`** with a `Resumo` sheet and a `Plano semanal` sheet; write distances as numeric km, paces as `min:seg/km`, and user-facing labels/descriptions in Brazilian Portuguese.
- [ ] **Step 4: Implement browser download with SheetJS and add a download button to the valid-plan preview; do not enable it until a plan has been generated.**
- [ ] **Step 5: Round-trip the workbook through `XLSX.write` and `XLSX.read` in tests; verify sheet names and representative cells remain intact. Run `npm test -- --run src/export src/App.test.tsx`.**
- [ ] **Step 6: Commit** with message `feat: export running plan as xlsx`.

### Task 6: Publishing the app through GitHub Pages

**Files:**
- Create: `.github\workflows\pages.yml`
- Modify: `package.json`, `vite.config.ts`

**Interfaces:**
- The workflow builds the app on pushes to the default branch and deploys the `dist` artifact with GitHub Pages.
- `npm run build` emits a static app whose asset URLs resolve from a repository subpath.

- [ ] **Step 1: Add a build-output test/check** that asserts generated asset references use relative paths and that `dist/index.html` exists.
- [ ] **Step 2: Configure the Pages workflow** with read-content, Pages, and OIDC permissions; build with Node 22 and `npm ci`; upload `dist`; deploy with the official Pages actions.
- [ ] **Step 3: Run `npm test -- --run`, `npm run typecheck`, and `npm run build`; verify all pass and the build-output check succeeds.**
- [ ] **Step 4: Verify the production build locally with `npm run preview` and confirm the page, form, preview, and XLSX download work without a backend.**
- [ ] **Step 5: Commit** with message `ci: deploy running plan app to pages`.
- [ ] **Step 6: In repository settings, enable GitHub Pages with GitHub Actions as the source; verify the workflow publishes the site.**
