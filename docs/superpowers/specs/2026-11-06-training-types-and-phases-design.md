# Design: structured running workouts with warm-up and cool-down

**Status:** builder check complete; awaiting user approval.

## Intent

Make the generated sessions reflect the running-workout categories in the Olympics.com article while showing how to warm up and cool down. Keep those easy-running phases inside the already planned weekly distance so the current load limits remain meaningful.

## Source and current behavior

The user referenced [Progressivo, longão e mais: conheça os tipos de treino de corrida](https://www.olympics.com/pt/noticias/treino-de-corrida-conheca-tipos). Its categories include easy running, long runs, fartlek, progressive running, and interval training, and it describes warm-up and cool-down as easy running or dynamic movement around the main work. The article does not prescribe universal session durations, repetitions, or a full weekly schedule; these must be conservative product decisions, not attributed to the article.

For generic phase durations, [Mayo Clinic guidance](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20045517) and the [American Heart Association](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down) describe gradual warm-up and cool-down periods in the 5–10 minute range. These are references for conservative defaults, not individualized prescriptions.

Today, `buildTrainingPlan` schedules easy, long, and a generic quality session. Quality alternates between intervals and threshold for shorter targets and remains threshold for longer targets. The preview and XLSX expose one pace and one generic description per session. Sessions are numbered but have no weekdays.

## User decisions

- Rotate the quality-session format rather than assign one fixed type per goal distance.
- Include warm-up and cool-down in every planned session, ordinarily as easy running, with duration adapted to the session.
- Count both phases inside the existing session and weekly distances; do not add mileage on top.
- Place an easy session immediately after a threshold or interval-style session in the displayed weekly order.

## Goals

- Rotate one quality session per week among threshold, intervals/tiros, fartlek, and progressive running; never stack multiple quality sessions in a week.
- Preserve the current weekly build, recovery, taper, 0.01 km precision, target-specific long-run share, and warning behavior.
- Represent each session as easy warm-up, a type-specific main workout, and easy cool-down. Distances of all three parts must sum exactly to the already allocated session distance.
- Show duration and easy pace for warm-up and cool-down, plus enough detail for a runner to follow the main set.
- Keep the sequence quality → easy recovery → long/easy in the preview and workbook, without inventing weekday assignments.
- Add focused tests for rotation, order, distance conservation, adapted phase times, low-volume safety, UI, and XLSX output.

## Non-goals

- Claiming that the article supplies exact prescriptions or that generated sessions guarantee readiness.
- Adding user-configurable workouts, weekdays, or medical screening.
- Increasing weekly mileage to accommodate warm-up, cool-down, or quality work.
- Scheduling more than one quality session per week.

## Approaches considered

1. **Rotate quality formats weekly (selected).** Cycle through threshold, intervals, fartlek, and progressive sessions while keeping one quality day per week. This uses the article's range of formats and the existing paces, at the cost of more scheduling and test logic.
2. **Choose a fixed quality format by target distance.** This is easier to explain and test but leaves some article formats unused and gives less variety across a training cycle.
3. **Keep the current threshold/interval alternation.** This minimizes changes but does not incorporate fartlek or progressive running, contrary to the user's choice.

## Proposed design

Keep the current training-plan entry point and overall weekly-distance allocation. Extend a session with an optional quality subtype and explicit warm-up, main-work, and cool-down distances and times. `distanceKm` remains the value allocated by the existing plan; all phase distances partition that total and must still sum to it at 0.01 km precision. Round the easy phases down, assigning the remaining hundredths to the main work.

Use the existing easy pace for warm-up, cool-down, and recovery intervals; use the threshold and interval paces for main quality work. Rotate the quality subtype by plan week in this order: threshold, intervals/tiros, fartlek, progressive. Keep no more than one quality session per week. In the displayed order, put its first easy recovery session immediately after the quality session, then the long run, then any remaining easy sessions. Keep the existing type-specific distance shares unchanged.

Use these proposed phase-duration targets:

| Session | Warm-up | Cool-down |
|---|---:|---:|
| Easy or long | 5 minutes | 5 minutes |
| Threshold, intervals, fartlek, or progressive | 10 minutes | 5 minutes |

Both phases are easy running. Convert the target times to distance at the runner's easy pace, floor to 0.01 km, then report the duration represented by that exact distance as `mm:ss`. For easy/long sessions too short to fit both target phases, scale both phases proportionally so they use no more than half of the session distance; use the remainder for continuous easy running and add a warning that the phase times were shortened to preserve the planned volume.

A quality session is eligible only when its allocation can fit both target phases and at least 1.00 km of main work. Otherwise, make the allocated session easy, preserve its full distance and place an explicit warning; do not create a tiny high-intensity set or raise weekly load. Its shortened easy phases follow the easy-session rule.

Main-work formats are product templates informed by, but not attributed as prescriptions from, the article:

- **Threshold:** repeat controlled blocks at threshold pace with easy jog recoveries, fitting the number of blocks to the allocated main-work distance.
- **Intervals/tiros:** use short interval repetitions with walk or easy-jog recoveries; the article's beginner/advanced examples are illustrative, so choose a conservative repeat count that fits.
- **Fartlek:** alternate faster segments with easy running; keep the faster segments at or below the existing interval pace.
- **Progressive:** divide the main distance into 40%, 40%, and 20% segments, building from easy to moderate to threshold effort.

Show warm-up and cool-down times, the type-specific main instructions, and the session total in both the preview and XLSX. Keep sessions numbered without assigning weekdays. Preserve BMI behavior and the existing user-facing note that this is general guidance, not an individualized prescription.

## Acceptance criteria

- Each quality week has exactly one subtype and all four subtypes appear as the cycle progresses.
- When a quality session is present, the next numbered session is easy.
- Every session's phase distances sum to its allocated total exactly to 0.01 km, and the sum of all sessions remains the weekly total.
- Warm-up, recovery, and cool-down use easy effort; workout segments use only the existing threshold/interval references and do not invent new pace anchors.
- Low-volume sessions do not receive a quality prescription that cannot fit inside the allocated distance; the fallback and shortened easy-phase times are explicit and do not increase volume.
- The preview and exported workbook show the phase times and a usable main-work description.
- Existing plan safety tests, typecheck, build, Pages asset check, and XLSX round-trip tests pass.
