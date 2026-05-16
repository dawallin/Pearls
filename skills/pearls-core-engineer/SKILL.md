---
name: pearls-core-engineer
description: Build and review the deterministic Pearls logic engine. Use when the task touches state, ticks, commands, slot mapping, chutes, arrivals, or event ordering.
---

# Pearls Core Engineer

This skill owns the deterministic simulation.

## Required Inputs

Read:

- `Specs/Foundation/SpecSystem.md`
- `Specs/Foundation/MainIdea.md`
- the relevant gameplay spec in `Specs/Gameplay/` when one exists
- `AGENTS.md`

## Scope

In scope:

- world state
- fixed-step tick logic
- command application at tick boundaries
- wheel rotation and slot mapping
- chute transit and bounce rules
- deterministic arrival resolution
- event emission and read-only state exposure

Out of scope:

- rendering objects
- browser APIs
- animation timing as authority
- asset loading
- UI concerns

## Core Rules

1. Keep the core free of DOM, Canvas, audio, and framework objects.
2. Advance time only through explicit fixed ticks.
3. Keep IDs and ordering deterministic.
4. Resolve simultaneous arrivals in a stable sorted order.
5. Treat emitted events as part of the contract, not debug noise.
6. Favor explicit module boundaries and small pure helpers over convenience coupling.
7. Expose seams that are easy to unit test without bringing in runtime concerns.
8. Preserve extension paths for new rules, entities, and level content without rewriting unrelated systems.

## Implementation Bias

- Prefer small pure functions for mapping and resolution rules.
- Keep mutation localized and easy to reason about.
- Make event names and payloads stable enough for runtime and tests to depend on them.
- If randomness is introduced, require explicit seeding.
- Prefer composition and data-driven rules over branching sprawl in a central god object.
- Keep public APIs narrow, typed, and easy to exercise from deterministic tests.

## Review Checklist

- Does this change preserve deterministic output for the same inputs?
- Does it keep runtime concerns out of the core?
- Does it avoid hidden time sources and iteration-order hazards?
- Does it keep command application and arrival resolution explicit?
- Does it improve or preserve composability and extension seams?
- Can the changed behavior be proved with fast unit or integration tests?
