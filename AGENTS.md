# AGENTS.md

## Purpose

Repository-wide operating rules for AI agents working on Pearls.

Default goal: keep the deterministic simulation architecture intact while moving quickly on specs in `Specs/`.

## Instruction Priority

When instructions conflict, follow this order:

1. Current user request
2. Relevant Foundation spec in `Specs/Foundation/`, then the relevant Gameplay spec in `Specs/Gameplay/` when one exists
3. This file (`AGENTS.md`)
4. Relevant skill in `skills/`
5. General engineering best practices

## Repository Overview

Pearls is planned as a TypeScript browser game with:

- a deterministic core / logic engine
- a separate runtime for rendering, input, assets, and debug UI
- cross-cutting foundation specs stored in `Specs/Foundation/`
- gameplay and content specs stored in `Specs/Gameplay/`

`Specs/Foundation/MainIdea.md` is the architectural baseline unless a newer foundation spec supersedes part of it.

## Project Description

Pearls is a deterministic simulation game built around wheels, slots, chutes, and moving pearls.

The project is intended to be implemented as two strict layers:

- a pure simulation core that owns authoritative state, rules, tick advancement, and emitted events
- a browser runtime that owns rendering, interpolation, input, assets, audio, and debugging surfaces

The core must stay reproducible from the same initial state and command sequence. Runtime visuals may be smooth and frame-based, but they must never decide simulation truth.

## Harness Mode

Default to a single working agent that shifts between specialist skills.

Use subagents only when all of the following are true:

- the task can be split into independent tracks
- contracts between tracks are already defined in a spec
- write scopes are unlikely to overlap
- waiting for serial work would materially slow delivery

Good early subagent candidates:

- runtime implementation after a core API is already fixed
- test authoring after the target behavior is already implemented
- narrow research or review tasks that do not block the next edit

Avoid subagents for open-ended architecture, first-pass scaffolding, or tasks where the interface is still moving.

## Required Workflow Before Editing

1. Read `Specs/Foundation/SpecSystem.md`.
2. Read the relevant foundation spec in `Specs/Foundation/`.
3. Read the relevant gameplay spec in `Specs/Gameplay/` when one exists.
4. If the task touches core architecture, also read `Specs/Foundation/MainIdea.md`.
5. If the task touches level structure or authoring rules, also read `Specs/Foundation/LevelAuthoring.md`.
6. If the task touches workflow, validation, or regression expectations, also read `Specs/Foundation/DevelopmentLoop.md`.
7. Choose the best matching skill from `skills/`.
8. Keep the change scoped to the spec and current request.
9. Validate the affected slice before finishing.

## Spec Roles

Foundation specs define repo-wide constraints, architecture rules, authoring rules, and workflow expectations.

Gameplay specs define feature behavior, mechanics, puzzles, progression, and content.

Gameplay specs may refine behavior, but they must not violate foundation constraints unless the relevant foundation spec is explicitly updated too.

## Role Routing

Use these repo-local skills when they match the task:

- `skills/pearls-orchestrator/SKILL.md`: choose the role, decide whether to stay single-agent or delegate
- `skills/pearls-architect/SKILL.md`: define boundaries, contracts, extension seams, and maintainability constraints
- `skills/pearls-product-owner/SKILL.md`: clarify player goals, game rules, acceptance criteria, and unresolved product questions
- `skills/pearls-core-engineer/SKILL.md`: deterministic simulation, state, events, rules
- `skills/pearls-runtime-engineer/SKILL.md`: rendering, input, assets, scene flow, debug overlay
- `skills/pearls-test-engineer/SKILL.md`: Vitest, Playwright, test hooks, CI-facing validation

## Architecture Guardrails

Do not:

- put browser APIs, rendering state, or wall-clock time into the core
- let tweens, animation completion, or frame timing decide simulation truth
- mix runtime view state with authoritative game state
- introduce unseeded randomness into deterministic logic
- bypass the command queue / tick model for convenience
- broaden a spec silently

Always preserve these boundaries:

- product owner owns gameplay intent, constraints, and acceptance criteria
- core owns rules, state transitions, tick advancement, and events
- runtime owns rendering, interpolation, input plumbing, assets, audio, and debug surfaces
- tests prove determinism at core level and behavior at runtime level

## Validation

When the repo has runnable code, validate in this order:

1. spec-specific checks
2. targeted tests for the changed area
3. project-wide build or test pass if available

If validation cannot run, state that explicitly.
