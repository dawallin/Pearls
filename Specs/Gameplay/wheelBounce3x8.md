# Wheel Bounce 3x8

## Purpose

Define a test board where a wheel-to-wheel transfer bounces because the destination wheel hole is occupied.

## Status

accepted

## Scope

In scope:

- a `3x8` test level
- one top `3x3` wheel
- two vertical slide cells in the center column
- one bottom `3x3` wheel
- one red ball in the top slide-facing wheel hole
- one red ball in the bottom slide-facing wheel hole
- bounce animation when the top ball reaches the occupied bottom hole

Out of scope:

- multiple bounces in one click
- queueing transfer attempts
- color-specific bounce rules

## Player-Visible Behavior

The board starts with one red ball in each wheel, both aligned with the slide path.

Clicking the top ball sends it down the slides toward the bottom wheel.

Because the bottom connected hole is occupied, the moving ball bounces and returns to the top wheel.

After the bounce finishes, both balls remain in their original wheel slots.

## Rules

1. The board is a `3x8` grid.
2. The top wheel occupies rows `0` through `2`.
3. Rows `3` and `4` in the center column contain two connected `verticalSlide` cells.
4. The bottom wheel occupies rows `5` through `7`.
5. Both wheels start with a red ball in their slide-facing connected hole.
6. A ball can leave a wheel only from that wheel's slide-facing connected hole.
7. If the destination connected hole is occupied, the source ball bounces back.
8. A bounced ball remains in its original source wheel slot.
9. Runtime animation must not decide whether a transfer or bounce occurred.

## Acceptance Criteria

- The level definition is a `3x8` test level in `src/core/levels/test/`.
- The selector exposes the board as `?test=test-6`.
- The board starts with one visible ball in each wheel.
- Clicking the top ball emits a core bounce event.
- The top ball animates toward the bottom wheel and back.
- After the bounce, both wheel slots remain occupied by their original balls.

## Required Tests

- unit coverage for occupied-destination bounce without state mutation
- integration coverage for controller bounce animation instruction
- behavior coverage for `test-6` bounce flow

## Open Questions

none
