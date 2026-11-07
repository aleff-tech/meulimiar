# Compact interval workout display

**Status:** Approved; implementation complete.

## Intent

Make interval (“tiro”) workouts easier to scan by replacing long lists of repeated segment labels with a compact description that still communicates the full session.

## Existing behavior

`formatCompleteWorkout` currently joins every segment label in order. Interval sessions store each work and recovery repetition as a separate segment, and can include a final `Leve extra` segment. The shared formatter is used by both the web preview and XLSX.

## Goals

- Compact only sessions with `qualityType === 'interval'`.
- Keep the total session distance and every segment's distance and pace represented.
- Use short labels such as `Aquec`, `Tiros`, `Recup`, and `Desaquec`.
- Show work and recovery counts separately, e.g. `15x Tiros` and `14x Recup`, to reflect the generated session exactly.
- Keep any `Leve extra` as its own item before the cool-down.
- Keep the preview and workbook text identical.

## Non-goals

- Change interval generation, repetitions, paces, distances, or timeline rendering.
- Compact threshold, fartlek, or progressive workouts.
- Remove, combine, or recalculate any generated segment.

## Approaches

1. **Compact in the shared formatter (chosen):** recognize interval sessions and group repeated segment details for display only. This avoids changing the workout model and keeps preview and XLSX consistent.
2. **Add explicit repetition structures to the plan model:** makes repetition data first-class but changes plan generation and downstream consumers even though the current segment sequence already contains the needed information.
3. **Compact only the preview:** smaller UI-only change, but leaves the XLSX verbose and inconsistent.

## Constraints and acceptance

- Preserve the generated order and represent every segment, including a `Leve extra`.
- Keep segment distances in their existing two-decimal format and include `min/km` with every displayed pace.
- Do not imply equal counts when the generated session has different numbers of work and recovery segments.
- Non-interval workout text remains unchanged.
- Example shape: `7,65 km · Aquec: 1.50 km (6:40 min/km) · 15x Tiros: 0.20 km (4:50 min/km) · 14x Recup: 0.15 km (6:40 min/km) · Leve extra: 0.30 km (6:40 min/km) · Desaquec: 0.75 km (6:40 min/km)`. The example extra is 0.30 km so the displayed components sum to the 7.65 km total.
