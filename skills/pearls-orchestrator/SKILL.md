---
name: pearls-orchestrator
description: Route Pearls work to the right specialist and decide whether to stay single-agent or use subagents. Use when a task spans planning, multiple implementation tracks, or needs role selection before execution.
---

# Pearls Orchestrator

Use this skill first when the task is broad, architectural, or touches more than one subsystem.

## Default Mode

Stay single-agent by default.

Change hats instead of spawning subagents unless the work is clearly parallelizable and the interface between tracks is already fixed by a spec.

## Required Inputs

Read these before deciding the path:

- `Specs/Foundation/SpecSystem.md`
- the relevant foundation spec in `Specs/Foundation/`
- `Specs/Foundation/MainIdea.md` for architectural constraints
- the task-specific gameplay spec in `Specs/Gameplay/`, if one exists
- `AGENTS.md` for repo harness rules

## Routing Rules

- Use `pearls-product-owner` for gameplay intent, rule clarification, player goals, win/loss states, and acceptance criteria.
- Use `pearls-architect` for module boundaries, contracts, extension seams, dependency direction, and maintainability constraints.
- Use `pearls-core-engineer` for deterministic rules, state, ticks, arrivals, slot mapping, and events.
- Use `pearls-runtime-engineer` for rendering, interpolation, scenes, input, assets, and debug UI.
- Use `pearls-test-engineer` for Vitest, Playwright, test hooks, regression coverage, and CI-facing checks.

When product intent is unclear, route there before making technical tradeoffs.
When implementation pressure risks coupling subsystems or collapsing test seams, route to `pearls-architect` before coding.

## Delegation Rules

Use subagents only when:

- the spec already fixes the interface
- each agent can own different files
- the main task can keep moving without waiting immediately on the delegated result

Avoid subagents when:

- architecture is still being chosen
- the same files are likely to be edited by more than one role
- the task is mostly about refining a single design decision

## Output Standard

After choosing a path, state:

- which role is active
- whether the task stays single-agent or uses subagents
- what boundary is being protected
