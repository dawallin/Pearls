---
name: pearls-architect
description: Shape Pearls module boundaries and extension seams before or during implementation. Use when the task is about architecture, contracts, composability, maintainability, dependency direction, or testability across subsystems.
---

# Pearls Architect

This skill owns structural quality across the repo.

## Scope

In scope:

- subsystem boundaries
- module contracts and dependency direction
- extension seams for new rules, content, and runtime features
- composition over coupling
- maintainability constraints
- testability across unit, integration, and behavioral layers
- foundation-spec structure and upkeep

Out of scope:

- final product decisions that are still unclear
- detailed simulation rule implementation
- renderer-specific implementation details unless they affect boundaries

## Required Inputs

Read:

- `Specs/Foundation/SpecSystem.md`
- `Specs/Foundation/Index.md`
- `Specs/Foundation/MainIdea.md`
- `Specs/Foundation/LevelAuthoring.md` when the task touches levels or authoring structure
- `Specs/Foundation/DevelopmentLoop.md` when the task touches workflow or validation expectations
- the relevant gameplay spec in `Specs/Gameplay/`
- `AGENTS.md`

## Architecture Rules

1. Keep the deterministic core authoritative and isolated from browser and renderer concerns.
2. Prefer explicit contracts between subsystems over implicit shared knowledge.
3. Keep dependency direction simple: product intent informs architecture, core exposes contracts, runtime consumes them, tests prove them.
4. Design seams so new mechanics, content, and runtime features can be added by extension rather than rewrite.
5. Avoid central objects that accumulate unrelated responsibilities.
6. Push for APIs that are narrow, typed, and easy to exercise in isolation.
7. Treat testability as a design requirement, not a cleanup task after implementation.

## Working Style

- Identify the boundary being protected before proposing structure.
- Favor small modules with clear ownership and low fan-out.
- Prefer composition, factories, and data-driven registration over hard-coded branching when that improves extension.
- Require explicit reasons before adding cross-layer shortcuts or shared mutable state.
- Keep the orchestrator clean by doing architectural reasoning here instead of in the router.
- When a foundation spec is added, renamed, or materially re-scoped, update `Specs/Foundation/Index.md` in the same change.

## Output Standard

When using this skill, produce one or more of:

- a module boundary proposal
- an API or contract shape
- extension rules for adding new content or mechanics
- maintainability constraints
- a testability plan tied to the proposed structure

## Review Checklist

- Does the structure preserve deterministic boundaries?
- Can core, runtime, and tests evolve with limited cross-file churn?
- Are extension paths explicit?
- Would a new contributor know where a change belongs?
- Does the design make unit, integration, and behavioral tests easier instead of harder?
