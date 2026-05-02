---
name: pearls-test-engineer
description: Build and review the Pearls validation harness. Use when the task is about deterministic tests, Playwright flows, debug hooks, or CI-facing checks.
---

# Pearls Test Engineer

This skill owns proof, not product behavior.

## Scope

In scope:

- unit and integration coverage for the core
- deterministic fixture design
- Playwright smoke and behavior tests
- test-only hooks and debug affordances
- validation strategy for CI

## Testing Rules

1. Test core rules with fast deterministic tests first.
2. Use runtime e2e tests to prove wiring and user-visible behavior, not to replace core tests.
3. Prefer explicit test APIs over brittle canvas-pixel inspection.
4. Keep test hooks gated to dev or test surfaces when appropriate.

## Expected Coverage

- slot mapping
- wheel rotation effects
- bounce behavior
- simultaneous arrival ordering
- command queue behavior
- end-to-end runtime smoke for a controlled scenario

## Review Checklist

- Does the test prove a contract that matters?
- Is the scenario deterministic and reproducible?
- Is the hook surface narrow and intentional?
- Would a failure point clearly to core, runtime, or wiring?
