# Wheel Transfer 3x8

## Purpose

Define a test board where one ball moves back and forth between two wheels through two vertical slide cells.

## Status

accepted

## Scope

In scope:

- a `3x8` test level
- one top `3x3` wheel
- two vertical slide cells in the center column
- one bottom `3x3` wheel
- one initial ball in the top wheel
- wheel-to-wheel transfer in both directions
- independent wheel rotation

Out of scope:

- multiple balls
- bounce logic
- branching paths
- automatic transfer

## Player-Visible Behavior

The board starts with one ball attached to the slide-facing hole of the top wheel. The bottom wheel starts empty.

Clicking the ball sends it over the two slide cells into the empty slide-facing hole of the other wheel.

Clicking the ball again sends it back to the first wheel when it is aligned with the slides.

Clicking the center of a wheel rotates that wheel by one slot.

If the ball is not in the hole aligned with the slides, clicking the ball does nothing.

## Rules

1. The board is a `3x8` grid.
2. The top wheel occupies rows `0` through `2`.
3. Rows `3` and `4` in the center column contain two connected `verticalSlide` cells.
4. The bottom wheel occupies rows `5` through `7`.
5. The top wheel starts with exactly one ball in the bottom-facing connected hole.
6. The bottom wheel starts empty.
7. A ball can leave a wheel only from that wheel's slide-facing connected hole.
8. A ball can enter the other wheel only if that wheel's slide-facing connected hole is empty.
9. Clicking the center of either wheel rotates only that wheel clockwise by one slot.
10. The ball remains in the same local wheel slot when its wheel rotates.
11. Clicking an empty wheel slot or outer wheel ring does not rotate the wheel.
12. The wheel renders slide connector backgrounds automatically where adjacent slide cells connect to it.

## Acceptance Criteria

- The level definition is a `3x8` test level in `src/core/levels/test/`.
- The selector exposes the board as `?test=test-4`.
- The top wheel visibly starts with a ball.
- Clicking the ball transfers it to the bottom wheel when it is aligned with the slides.
- Clicking the ball again transfers it back to the top wheel when it is aligned with the slides.
- Clicking a wheel center rotates that wheel clockwise by one slot.
- Clicking the ball while it is not aligned with the slides causes no transfer.
- Clicking an empty wheel slot does not rotate the wheel.
- The top wheel and bottom wheel both show a slide connector background at their slide-facing wheel cell.

## Deterministic Implications

The core must represent:

- both wheel states
- which wheel currently contains the ball
- each wheel's rotation step
- the connected world slot for each wheel
- explicit events for transfer and rotation

The runtime animation must not decide whether the ball transferred or whether a wheel rotated.

## Level Or Content Notes

This spec uses the test level `testWheelTransfer3x8Level`.

## Required Tests

- unit coverage for transfer gating and independent wheel rotation
- integration coverage for controller animation gating
- behavior coverage for `test-4` transfer and blocked transfer after rotation

## Open Questions

none
