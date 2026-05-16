# Dispatcher Slide Wheel 1x3

## Purpose

Define the first multi-component Pearls test board with a dispatcher, a vertical slide, and a wheel arranged in a single column.

## Status

accepted

## Scope

In scope:

- a `1x3` test level
- one `dispatcherDown` at the top cell
- one `verticalSlide` in the middle cell
- one wheel in the bottom cell
- one initial ball in the dispatcher
- dispatch interaction
- the ball landing in the wheel
- rotating the wheel clockwise after the ball has landed

Out of scope:

- multiple balls
- multiple dispatchers
- bounce logic
- branching paths
- wheel-to-wheel transfer

## Player-Visible Behavior

The board starts with a ball visibly sitting in the center of the top dispatcher.

When the dispatcher is pressed, the ball is pushed downward onto the vertical slide and continues down into the wheel.

The ball should settle into the wheel hole that is pointing upward and aligned with the slide.

After the ball is in the wheel, pressing the wheel rotates it clockwise and the ball rotates together with it.

## Rules

1. The board is a `1x3` grid.
2. The top cell contains a `dispatcherDown`.
3. The middle cell contains a `verticalSlide`.
4. The bottom cell contains a wheel with `8` slots.
5. The dispatcher starts with exactly one ball.
6. Pressing the dispatcher consumes that ball and sends it downward.
7. The ball lands in the upward-facing connected wheel hole.
8. The dispatcher cannot dispatch a second ball in this test board.
9. The wheel can be rotated even when it is empty.
10. If the wheel is rotated before dispatch, the ball still lands in the hole that is currently pointing upward and connected to the slide.
11. After the ball has landed, pressing the wheel rotates it one slot clockwise per press.
12. The ball remains in the same wheel slot as the wheel rotates, so it visibly travels with the wheel.

## Acceptance Criteria

- The level definition is a `1x3` test level in `src/core/levels/test/`.
- The dispatcher visibly starts with a ball.
- Pressing the dispatcher removes the ball from the dispatcher and animates it down the slide.
- The ball ends up visually attached to the wheel.
- Pressing the wheel before dispatch rotates it clockwise by one slot.
- Dispatching after a pre-rotation still lands the ball in the upward-facing connected hole.
- Pressing the wheel after the landing rotates the wheel clockwise by one slot.
- The ball rotates with the wheel after landing.

## Deterministic Implications

The core must represent:

- whether the dispatcher still has its initial ball
- whether the wheel contains the ball
- the wheel rotation step
- explicit events for dispatch, landing, and rotation

The runtime animation must not decide whether the ball landed or whether the wheel rotated.

## Level Or Content Notes

This spec uses the test level `testDispatcherSlideWheel1x3Level`.

## Required Tests

- unit coverage for the board world dispatch and rotation rules
- integration coverage for the board controller gating dispatch and wheel rotation
- behavior coverage for clicking the dispatcher and then clicking the wheel

## Open Questions

none
