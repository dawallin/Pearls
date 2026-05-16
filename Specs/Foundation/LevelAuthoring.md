# Pearls Level Authoring

## Purpose

This spec defines the repo-wide rules for how Pearls levels are represented and introduced.

It is a foundation spec, not a single-level design doc.

## Core Rule

All levels must be defined as data in the core.

Runtime scenes may render and interact with level content, but they must not hard-code authoritative level structure.

## Level Categories

Pearls uses two level categories:

- `test levels`: small controlled setups for development, debugging, validation, and regression
- `game levels`: player-facing designed content

Both categories must use the same level schema unless a foundation spec explicitly introduces a justified exception.

## Directory Rule

Core level definitions should be organized like this:

- `src/core/levels/test/`
- `src/core/levels/game/`

Test levels are not throwaway code. They are part of the executable development surface.

## Grid Rule

Levels are defined on a grid with explicit size:

- `columns`
- `rows`

Each cell may contain zero or one component unless a later foundation spec explicitly introduces layered cells.

The initial supported component set may be small. The schema should still be designed so additional component types can be added without rewriting unrelated level structure.

## Component Rule

Each component placed in a level must:

- have an explicit type
- have a stable identifier
- carry the minimum configuration needed by deterministic core logic

Component behavior belongs to component systems, not to level files.

Level files place and configure components. They do not implement behavior.

## Test Level Rule

Every new component type must ship with at least one minimal test level.

Every new mechanic or interaction rule should gain a minimal test level before it appears in player-facing content.

Prefer the smallest possible test level that proves the intended behavior.

Examples:

- `1x1` for one wheel
- `2x1` for two adjacent components
- `3x2` for a small interaction network

## Game Level Rule

Game levels should be built from the same schema and component catalog used by test levels.

Do not create a special runtime-only format for real content unless a later foundation spec explicitly approves that split.

## Validation Rule

Level authoring changes should be validated with:

1. schema or construction validation for the level definition
2. deterministic tests for the component or mechanic involved
3. behavior or integration tests when the level is used as a runtime scenario
