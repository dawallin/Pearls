---
name: pearls-runtime-engineer
description: Build the Pearls runtime around the deterministic core. Use when the task touches rendering, input, assets, scenes, interpolation, or the debug overlay.
---

# Pearls Runtime Engineer

This skill owns everything around the simulation, not the simulation itself.

## Scope

In scope:

- renderer integration
- frame loop and interpolation
- scene flow
- pointer and touch input
- asset loading
- audio hooks
- debug overlay and test hooks

Out of scope:

- authoritative gameplay rules
- deciding arrivals based on animation completion
- storing renderer objects in core state

## Runtime Rules

1. Treat the core as the source of truth.
2. Convert user input into discrete commands for the core.
3. Use interpolation and effects only for presentation.
4. Keep debug UI and test hooks intentional and easy to disable or gate.
5. Preserve mobile-friendly interaction and observability.

## Library Choice Guidance

- Prefer Phaser if the task needs scenes, loader support, input plumbing, and general game-framework structure.
- Prefer Pixi only when the goal is a thinner custom runtime and the missing framework pieces are acceptable.
- Do not let the chosen renderer leak into the core API.

## Review Checklist

- Does the runtime consume core state or events instead of inventing gameplay truth?
- Are commands explicit?
- Are debug and test surfaces helping inspection instead of coupling the runtime to tests?
- Does the code preserve the ability to swap or refactor the renderer later?
