# Colored Dispatcher Refill 3x8

## Purpose

Define a test board where a dispatcher emits a fixed sequence of colored balls into a wheel.

## Status

accepted

## Scope

In scope:

- a `3x8` test level
- one `dispatcherDown` spanning the top `3x3` area
- two vertical slide cells in the center column
- one wheel spanning the bottom `3x3` area
- three colored balls in a deterministic sequence: red, green, blue
- configurable deterministic refill delay between balls
- wheel rotation between dispatches to free the connected wheel slot

Out of scope:

- random ball colors
- infinite refill
- color-matching scoring
- multiple dispatchers

## Player-Visible Behavior

The board starts with a red ball visible in the dispatcher.

When the dispatcher is clicked, the red ball moves down the slide and lands in the wheel.

After the configured refill delay, the dispatcher shows a green ball.

The player must rotate the wheel one step before dispatching the next ball, otherwise the connected wheel slot remains occupied and the dispatcher cannot eject.

After the green ball is dispatched, the dispatcher refills with a blue ball after the same configured delay.

After the blue ball is dispatched, the dispatcher remains empty.

## Rules

1. The board is a `3x8` grid.
2. The top `3x3` area contains a `dispatcherDown`.
3. Rows `3` and `4` in the center column contain two connected `verticalSlide` cells.
4. The bottom `3x3` area contains a wheel with `8` slots.
5. The dispatcher starts with `ball-red`.
6. `ball-red` has color `red`.
7. The dispatcher refill queue is `ball-green`, then `ball-blue`.
8. `ball-green` has color `green`.
9. `ball-blue` has color `blue`.
10. Each queued ball uses the configured refill delay before appearing.
11. Refill timing is deterministic core time, not runtime animation completion.
12. A ball can dispatch only if the wheel's connected world slot is empty.
13. Wheel slots store ball identity, and color follows the ball as the wheel rotates.
14. After `ball-blue` dispatches, no further refill occurs.

## Acceptance Criteria

- The level definition is a `3x8` test level in `src/core/levels/test/`.
- The selector exposes the board as `?test=test-5`.
- The dispatcher visibly starts with a red ball.
- Red, green, and blue balls land in distinct wheel slots after rotating the wheel between dispatches.
- The dispatcher remains empty after blue is dispatched and core time advances beyond the refill delay.
- Runtime rendering receives ball color from core snapshots or dispatch instructions.

## Deterministic Implications

The core must represent:

- ball identity
- ball color
- dispatcher held ball
- dispatcher refill queue
- refill-ready core time
- wheel slots as ball IDs
- colored ball snapshots for runtime read models

The runtime may advance core time, but it must not decide which color appears or whether a refill occurs.

## Level Or Content Notes

This spec uses the test level `testColoredDispatcherSlideWheel3x8Level`.

## Required Tests

- unit coverage for colored ball identity, refill timing, and wheel slot color preservation
- integration coverage for controller dispatch instructions and deterministic refill advancement
- behavior coverage for the red -> green -> blue flow using the debug time hook

## Open Questions

none
