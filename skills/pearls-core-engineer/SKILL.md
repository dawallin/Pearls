---
name: pearls-core-engineer
description: Build and review the deterministic Pearls logic engine. Use when the task touches state, ticks, commands, slot mapping, chutes, arrivals, or event ordering.
---

# Pearls Core Engineer

This skill owns the deterministic simulation.

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

## Implementation Bias

- Prefer small pure functions for mapping and resolution rules.
- Keep mutation localized and easy to reason about.
- Make event names and payloads stable enough for runtime and tests to depend on them.
- If randomness is introduced, require explicit seeding.

## Review Checklist

- Does this change preserve deterministic output for the same inputs?
- Does it keep runtime concerns out of the core?
- Does it avoid hidden time sources and iteration-order hazards?
- Does it keep command application and arrival resolution explicit?
