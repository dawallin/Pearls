# Double Dispatcher Wheel 8x8

## Purpose

Define a test board where two dispatcher orientations feed the same wheel.

## Status

accepted

## Scope

In scope:

- an `8x8` test level
- one `dispatcherDown` spanning a `3x3` area above the wheel
- two vertical slide cells connecting the top dispatcher to the wheel
- one `dispatcherRight` spanning a `3x3` area directly left of the wheel
- two horizontal slide cells connecting the left dispatcher to the wheel
- one wheel spanning a `3x3` area
- dispatching from both dispatchers into the wheel

Out of scope:

- multiple active balls
- refilling dispatchers

## Player-Visible Behavior

The wheel sits in the bottom-right `3x3` area.

A down dispatcher sits above the wheel and connects through vertical slide cells.

A right-facing dispatcher sits to the left of the wheel and connects through horizontal slide cells.

Clicking either dispatcher ejects its ball toward the wheel. Once a ball reaches the wheel, it sticks in the wheel slot connected to that path.

## Rules

1. The board is an `8x8` grid.
2. The wheel occupies the bottom-right `3x3` area.
3. The down dispatcher occupies the `3x3` area above the wheel.
4. The right dispatcher occupies the `3x3` area left of the wheel.
5. The down dispatcher connects to the upward-facing wheel slot.
6. The right dispatcher connects to the left-facing wheel slot.
7. Each dispatcher starts with one ball.
8. Each dispatcher can be clicked independently.
9. A ball cannot enter an occupied connected wheel slot.

## Acceptance Criteria

- The level definition is a test level in `src/core/levels/test/`.
- The selector exposes the board as `?test=test-3`.
- The level schema supports `dispatcherRight` and `horizontalSlide` component types.
- The right dispatcher uses separate shell and background assets.
- Clicking each dispatcher places one ball in the connected wheel slot.
- Both balls remain visible in their own wheel positions.

## Required Tests

- unit coverage for the multi-dispatcher board rules
- integration coverage for dispatching from both configured dispatchers
- behavior coverage that `test-3` dispatches from both paths
