# AGENTS.md

## Purpose

Repository-wide operating rules for AI agents working on Pearls.

Default goal: keep the deterministic simulation architecture intact while moving quickly on specs in `Specs/`.

## Instruction Priority

When instructions conflict, follow this order:

1. Current user request
2. Relevant spec in `Specs/`
3. This file (`AGENTS.md`)
4. Relevant skill in `skills/`
5. General engineering best practices

## Repository Overview

Pearls is planned as a TypeScript browser game with:

- a deterministic core / logic engine
- a separate runtime for rendering, input, assets, and debug UI
- specs stored in `Specs/`

`Specs/MainIdea.md` is the architectural baseline unless a newer spec supersedes part of it.

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

1. Read the relevant spec in `Specs/`.
2. If the task touches core architecture, also read `Specs/MainIdea.md`.
3. Choose the best matching skill from `skills/`.
4. Keep the change scoped to the spec and current request.
5. Validate the affected slice before finishing.

## Role Routing

Use these repo-local skills when they match the task:

- `skills/pearls-orchestrator/SKILL.md`: choose the role, decide whether to stay single-agent or delegate
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
