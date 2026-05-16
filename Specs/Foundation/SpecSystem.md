# Pearls Spec System

## Purpose

This foundation spec defines how Pearls specifications are organized, how they relate to one another, and how they are enforced.

It is the source of truth for spec hierarchy.

## Spec Categories

Pearls uses one spec system with two categories:

- `Foundation specs` in `Specs/Foundation/`
- `Gameplay specs` in `Specs/Gameplay/`

They are both specs. They differ by scope, not by file format.

## Foundation Specs

Foundation specs define repo-wide rules and constraints.

They answer questions like:

- how the project must be structured
- what architectural boundaries must be preserved
- how levels are represented
- how validation and regression loops work
- what platform and toolchain decisions are currently accepted

Foundation specs are cross-cutting and apply unless they are explicitly replaced by a newer foundation spec.

## Gameplay Specs

Gameplay specs define feature behavior, mechanics, puzzles, progression, and content.

They answer questions like:

- what a mechanic does
- what a level or puzzle requires
- what player-visible behavior should occur
- what acceptance criteria a feature must satisfy

Gameplay specs are local to the feature or content they describe.

## Hierarchy

When instructions or specs conflict, use this order:

1. current user request
2. relevant foundation spec
3. relevant gameplay spec
4. `AGENTS.md`
5. relevant skill guidance

If a gameplay spec conflicts with a foundation spec, the foundation spec wins until it is explicitly updated.

## When To Create A Foundation Spec

Create or update a foundation spec when a rule is:

- repo-wide
- architectural
- workflow-related
- level-authoring related
- intended to constrain multiple future gameplay specs

Do not bury cross-cutting rules inside a single gameplay spec.

## When To Create A Gameplay Spec

Create or update a gameplay spec when a rule is:

- feature-specific
- mechanic-specific
- level-specific
- content-specific
- acceptance-criteria specific for a particular slice of the game

Do not promote local feature behavior into foundation unless it is meant to constrain the whole repo.

## Enforcement Model

Specs are enforced by a combination of roles and executable checks.

- `AGENTS.md` enforces reading order and workflow expectations
- `pearls-orchestrator` routes work to the right specialist
- `pearls-architect` enforces foundation constraints and boundaries, and owns upkeep of foundation-spec structure and indexes
- `pearls-product-owner` keeps gameplay specs explicit and testable
- `pearls-core-engineer` and `pearls-runtime-engineer` implement within the allowed boundaries
- `pearls-test-engineer` turns required behavior into regression-resistant proof
- tests and CI enforce what can be made executable

## Maintenance Ownership

Foundation spec maintenance is primarily owned by the `pearls-architect` role.

That includes:

- refining cross-cutting rules
- restructuring foundation docs when they become unclear
- keeping `Specs/Foundation/Index.md` accurate
- updating references in `AGENTS.md` and skills when foundation structure changes

Gameplay spec maintenance is primarily owned by the `pearls-product-owner` role, with support from architecture and test roles when constraints or proof obligations change.

## Practical Rule

Use markdown specs for intent and constraints.

Use tests for executable proof.

Use skills to apply the rules consistently during implementation and review.

Do not rely on a long standalone style checklist as the primary enforcement mechanism.

## Relationship To Tests

Specs define what should be true.

Tests define how that truth is proved repeatedly.

If a behavior matters and can be made executable, prefer enforcing it with tests rather than only documenting it in prose.
