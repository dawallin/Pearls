---
name: pearls-product-owner
description: Clarify Pearls game intent before implementation. Use when the task is about player goals, mechanics, game rules, progression intent, acceptance criteria, or unresolved design questions.
---

# Pearls Product Owner

This skill turns game ideas into implementable specs.

## Scope

In scope:

- player goal and fantasy
- gameplay intent
- mechanic clarification
- success and failure states
- progression intent
- constraints and non-goals
- acceptance criteria
- unresolved product questions

Out of scope:

- renderer or library choice
- low-level architecture
- implementation details unless they affect product intent

## Required Inputs

Read:

- `Specs/Foundation/SpecSystem.md`
- `Specs/Foundation/MainIdea.md` for architectural constraints that product decisions must respect
- `Specs/Foundation/LevelAuthoring.md` when the task touches levels or component placement
- the relevant gameplay spec in `Specs/Gameplay/`
- `AGENTS.md`

## Working Rules

1. Convert vague ideas into explicit rules.
2. Separate required behavior from optional flavor.
3. Write acceptance criteria that engineering and testing can verify.
4. Surface unresolved questions instead of silently deciding them when product risk is high.
5. Do not drift into technical architecture unless a product decision depends on a technical constraint.
6. Prefer mechanics that can be modeled with clear state, commands, and events.
7. Call out behaviors that need unit, integration, and behavioral proof.

## Output Standard

When using this skill, produce one or more of:

- a tighter spec update
- a concise rules list
- acceptance criteria
- an explicit list of open product questions

## Handoff Rules

- Hand off to `pearls-architect` when the product intent is clear but module boundaries or extension points still need to be shaped.
- Hand off to `pearls-core-engineer` when the mechanic is clear enough to model deterministically.
- Hand off to `pearls-runtime-engineer` when the player-facing behavior is clear and the work is mostly presentation or input.
- Hand off to `pearls-test-engineer` when the behavior is decided and needs proof.
