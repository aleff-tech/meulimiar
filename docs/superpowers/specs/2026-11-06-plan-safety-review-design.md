# Design: safer target-specific plan distances

**Status:** approved by the user.

## Intent

Correct two gaps found in review: displayed rounding can exceed the planned weekly growth or taper limit, and target distance currently has little effect on session distances.

## Goals and constraints

- Preserve the existing weekly-volume progression and its 5% light / 8% aggressive build caps; rounding must not exceed those caps, the 20% cutback, or the final 60% taper.
- Use 0.01 km (10 m) precision for weekly and session distances so low-volume plans can progress in small increments without exceeding those limits.
- Allocate 20%, 25%, 30%, 35%, or 40% of weekly volume to the long run for 3 km, 5 km, 10 km, half marathon, or marathon, respectively. Keep the remaining distribution consistent with session count and existing easy/quality rules.
- Warn when the longest planned long run is below 75% of the target distance; when only one weekly session is selected and no long run is scheduled, report that limitation instead. Do not force mileage increases to clear the warning.
- Keep BMI informational and preserve browser-only processing, the XLSX export, existing pace calculations, and all current load caps.

## Non-goals

- Raising growth caps or prescribing a medically individualized training plan.
- Claiming that clearing the long-run threshold guarantees race readiness.

## Approaches considered

1. **Use 0.01 km precision and target-aware allocation (selected).** This permits exact cap enforcement and gradual progression at low starting volumes, while target-specific long-run shares make the calendar responsive to race distance. The tradeoff is that distances show two decimals.
2. **Keep 0.1 km precision and round down.** This avoids exceeding caps but can stall progression for a low weekly base, since a 0.1 km increase may be larger than the allowed growth.
3. **Keep the current shares and only add warnings.** This would leave target distances with nearly identical calendars and would not address the design requirement that sessions vary by target.

## User decision

The user selected 0.01 km precision. The target-specific shares and 75% warning threshold above were presented in the same choice and are part of the selected approach.

## Builder decisions

Retain the existing weekly-volume progression, session counts, paces, and workout types. Implement rounding so displayed weekly totals and session sums remain consistent and all limits are respected; tests should cover low-volume progression, cutback/taper boundaries, all target shares, and insufficient-long-run warnings.
