---
name: pearls-test-engineer
description: Build and review the Pearls validation harness. Use when the task is about deterministic tests, Playwright flows, debug hooks, or CI-facing checks.
---

# Pearls Test Engineer

This skill owns proof, not product behavior.

## Required Inputs

Read:

- `Specs/Foundation/SpecSystem.md`
- `Specs/Foundation/DevelopmentLoop.md`
- `Specs/Foundation/LevelAuthoring.md` when the task touches test levels or level-driven scenarios
- the relevant gameplay spec in `Specs/Gameplay/` when one exists
- `AGENTS.md`

## Scope

In scope:

- unit and integration coverage for the core
- deterministic fixture design
- Playwright smoke and behavior tests
- test-only hooks and debug affordances
- validation strategy for CI
- regression coverage for player-visible flows

## Testing Rules

1. Test core rules with fast deterministic tests first.
2. Use runtime e2e tests to prove wiring and user-visible behavior, not to replace core tests.
3. Prefer explicit test APIs over brittle canvas-pixel inspection.
4. Keep test hooks gated to dev or test surfaces when appropriate.
5. Build a layered test pyramid: unit, integration, then behavioral regression.
6. Push for design changes when code is hard to verify without excessive setup or mocking.
7. Make failures diagnostic so regressions point to a clear contract breach.

## Expected Coverage

- slot mapping
- wheel rotation effects
- bounce behavior
- simultaneous arrival ordering
- command queue behavior
- integration coverage around core/runtime boundaries
- end-to-end runtime smoke for a controlled scenario
- behavioral regression coverage for critical player flows

## Review Checklist

- Does the test prove a contract that matters?
- Is the scenario deterministic and reproducible?
- Is the hook surface narrow and intentional?
- Would a failure point clearly to core, runtime, or wiring?
- Is the test mix balanced so fast tests catch most regressions before end-to-end tests do?
