# Workout Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible, distance-scaled visual timeline column for every workout session in the weekly-plan preview.

**Architecture:** Extend `WorkoutSession` with ordered, typed workout segments generated alongside the existing descriptions. Render those segments with a focused React component and a one-time legend in the preview table; do not parse description text or change the XLSX export.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-11-06-workout-timeline-design.md`

## Global Constraints

- “A soma das distâncias dos segmentos deve continuar correspondendo à distância total planejada da sessão, com a precisão de 0,01 km já usada pelo gerador.”
- “A largura representa distância relativa dentro do treino.”
- “Cada sessão aparece na prévia.”
- “A exportação XLSX e o cálculo do plano permanecem sem alterações funcionais.”
- Keep the existing workout descriptions and prescriptions; generate segments from the same prescription data, never by parsing prose.
- Provide a single legend, accessible labels, and visual markers for short segments; do not rely on color alone.

## Review Focus

- Easy and long sessions must show their warm-up, continuous easy main segment, and cool-down in order; test in `trainingPlan.test.ts`.
- Threshold and interval repetitions must retain their exact work/recovery counts, paces, and order; test using the existing 2 × 3 min threshold case and 8 × 300 m / 7 × 200 m interval case.
- Fartlek cycles and the remaining easy distance must stay distinct and ordered; test using the existing 10-cycle case.
- Progressive workouts must preserve easy, moderate, and threshold portions in order and at the right paces; test the progressive week.
- Very short remainder segments and quality-to-easy fallback sessions must remain represented without changing session totals; test in `trainingPlan.test.ts` and `WorkoutTimeline.test.tsx`.
- Every preview row must have a screen-reader description and chart; test the accessible name and rendered timeline count in `WorkoutTimeline.test.tsx` and `App.test.tsx`.

---

### Task 1: Add structured segments to generated sessions

**Files:**
- Modify: `src/domain/trainingPlan.ts`
- Test: `src/domain/trainingPlan.test.ts`

**Interfaces:**
- Produces `WorkoutSegmentPhase = 'warmup' | 'easy' | 'work' | 'recovery' | 'moderate' | 'cooldown'`.
- Produces `WorkoutSegment` with `phase: WorkoutSegmentPhase`, `distanceKm: number`, `paceSecondsPerKm: number`, and `label: string`.
- Adds `segments: WorkoutSegment[]` to `WorkoutSession`; each session’s segments are ordered and their distances sum to `distanceKm` to 0.01 km.

- [ ] **Step 1: Add tests for easy and long session segments**

In `src/domain/trainingPlan.test.ts`, verify a two-session plan produces `warmup → easy → cooldown` segments for both session types, that every segment uses the easy pace, and that segment distances sum to the session distance.

- [ ] **Step 2: Run the domain tests and verify they fail**

Run: `npm test -- --run src/domain/trainingPlan.test.ts`
Expected: FAIL because `WorkoutSession` does not yet expose `segments`.

- [ ] **Step 3: Add tests for each quality structure**

In `src/domain/trainingPlan.test.ts`, assert the existing fixtures produce:
- Threshold: `warmup → work → recovery → work → easy remainder → cooldown`, with two work segments and one recovery for the base profile.
- Interval: eight 300 m work segments at 4:25 min/km, seven 200 m recovery segments at 6:00 min/km, and the 0.01 km easy remainder.
- Fartlek: ten one-minute work/recovery cycles at easy recovery pace and the 0.32 km easy remainder.
- Progressive: `warmup → easy → moderate → work → cooldown`.

For each fixture, assert segment distances sum to the generated session distance. Also assert a quality session adapted to easy running has only warm-up, easy, and cool-down phases.

- [ ] **Step 4: Run the domain tests and verify they still fail for missing segments**

Run: `npm test -- --run src/domain/trainingPlan.test.ts`
Expected: FAIL on the new segment assertions, not on test setup or existing workout descriptions.

- [ ] **Step 5: Implement structured segment generation in `src/domain/trainingPlan.ts`**

Add the declared segment types and property. Build segments from the selected repeat set/cycle/progressive portions and the fitted warm-up/cool-down distances; keep `description` content unchanged and derive both outputs from the same workout prescription.

- [ ] **Step 6: Run the domain tests**

Run: `npm test -- --run src/domain/trainingPlan.test.ts`
Expected: PASS, including existing description, volume, and quality-fallback assertions.

- [ ] **Step 7: Commit the domain model**

```bash
git add src/domain/trainingPlan.ts src/domain/trainingPlan.test.ts
git commit -m "feat: model workout timeline segments"
```

### Task 2: Render the timeline column in the preview

**Files:**
- Create: `src/components/WorkoutTimeline.tsx`
- Test: `src/components/WorkoutTimeline.test.tsx`
- Modify: `src/components/TrainingPreview.tsx`
- Test: `src/App.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes `WorkoutSegment[]` from Task 1.
- `WorkoutTimeline({ segments }: { segments: WorkoutSegment[] })` renders one horizontal timeline with an accessible name formed from the ordered segment labels.
- `WorkoutTimelineLegend()` renders the shared legend once above the table.

- [ ] **Step 1: Add the component test first**

Create `src/components/WorkoutTimeline.test.tsx`. Render an ordered set of warm-up, work, recovery, and cool-down segments; assert the `img` role’s accessible name preserves that order, each segment has the matching phase marker, and its `flex-grow` value equals its distance (for example 1, 2, 1, 1).

- [ ] **Step 2: Run the component test and verify it fails**

Run: `npm test -- --run src/components/WorkoutTimeline.test.tsx`
Expected: FAIL because `WorkoutTimeline` does not exist.

- [ ] **Step 3: Implement `WorkoutTimeline` and the shared legend**

Create the component to render a `role="img"` timeline, with segments whose flex growth is proportional to `distanceKm`; include the segment label in the accessible name and each block’s title. Add phase-specific classes and compact chart, short-segment marker, and legend styles in `src/styles.css`.

- [ ] **Step 4: Run the component test**

Run: `npm test -- --run src/components/WorkoutTimeline.test.tsx`
Expected: PASS for order, proportional widths, and accessible content.

- [ ] **Step 5: Add the preview integration test**

In `src/App.test.tsx`, generate the existing 12-week, four-sessions-per-week plan and assert the table has an `Estrutura visual` column, one timeline image per session (48 total), and a quality-session accessible name including warm-up, work/recovery, and cool-down labels.

- [ ] **Step 6: Run the integration test and verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because the preview table does not yet render the timeline column.

- [ ] **Step 7: Integrate the legend and timeline column in `src/components/TrainingPreview.tsx`**

Render the shared legend once above the table, add the `Estrutura visual` header and a `WorkoutTimeline` cell for every session. Keep all existing text columns and the XLSX export unchanged.

- [ ] **Step 8: Run focused tests**

Run: `npm test -- --run src/domain/trainingPlan.test.ts src/components/WorkoutTimeline.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit the preview**

```bash
git add src/components/WorkoutTimeline.tsx src/components/WorkoutTimeline.test.tsx src/components/TrainingPreview.tsx src/App.test.tsx src/styles.css
git commit -m "feat: visualize workout timelines"
```

- [ ] **Step 10: Run final verification**

Run: `npm test -- --run`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: TypeScript exits successfully.

Run: `npm run build`
Expected: TypeScript and Vite production build succeed.
