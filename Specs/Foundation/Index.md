# Pearls Foundation Index

## Purpose

This index maps the foundation specs and explains when to read each one.

Use it as the entry point for repo-wide rules.

## Ownership

The `pearls-architect` role is responsible for keeping this index accurate when foundation specs are added, removed, renamed, or materially re-scoped.

The `pearls-orchestrator` role should route foundation-spec structure changes through the architect.

## Foundation Specs

### `SpecSystem.md`

Read this first when you need to understand:

- foundation vs gameplay specs
- spec hierarchy
- when to create or update a foundation spec
- who enforces what

### `MainIdea.md`

Read this for:

- the architectural baseline
- deterministic core vs runtime separation
- simulation truth boundaries
- core event and state principles

### `PlatformSpec.md`

Read this for:

- accepted platform stack
- runtime framework choice
- test tool choices
- deployment and node version expectations

### `Harness.md`

Read this for:

- single-agent default working mode
- when to use specialist roles
- when subagents are appropriate

### `LevelAuthoring.md`

Read this for:

- test levels vs game levels
- grid-based level rules
- component placement rules
- level schema expectations

### `DevelopmentLoop.md`

Read this for:

- local-first Ralph loop expectations
- required validation layers
- test responsibilities
- drift prevention rules

## Maintenance Rule

Whenever a foundation spec is added, removed, renamed, or substantially repurposed:

1. update this index in the same change
2. update any affected references in `AGENTS.md` and relevant skills
3. update `SpecSystem.md` if the change affects hierarchy or ownership
