# Harmony Wheel Clear 3x8

## Purpose

Define Test 8: a minimal dispatcher-slide-wheel board where filling one eight-slot wheel with a single player-chosen pearl color clears the wheel for reuse.

## Status

accepted

## Scope

In scope:

- a `3x8` dispatcher-slide-wheel test level
- one reusable eight-slot harmony wheel
- sixteen authored red pearls: one initial pearl and fifteen deterministic refills
- a data-defined harmony clear rule
- an atomic core clear event and temporary runtime burn presentation

Out of scope:

- fixed slot-color patterns, scoring, progression, failure states, and automatic dispatch
- random pearl queues, destructible wheels, final art, or audio

## Player-Visible Behavior

The player manually dispatches a pearl, rotates the wheel to expose the connected hole, and repeats. A pearl in the slide-facing wheel hole can also be clicked to eject it back through the slide; the source wheel does not care that a dispatcher lies at the far end. When all eight holes hold the same color, all eight pearls—including the arriving eighth pearl—briefly burn away and the empty wheel remains usable. The same level can clear the wheel twice.

## Rules

1. The board is a `3x8` test level with one down-facing dispatcher, two vertical slides, and one eight-slot wheel.
2. The dispatcher starts with `ball-red-01` and refills `ball-red-02` through `ball-red-16` in that order using deterministic core time.
3. Dispatch is manual and independent of downstream wheel occupancy. The player must rotate an occupied connected slot away before another pearl can land; a pearl arriving at an occupied slot bounces and burns when it returns to its originating dispatcher.
4. A wheel with `{ type: "harmony" }` clears only if every local slot is occupied and every occupant has the same color.
5. An empty or partial wheel never matches. A full mixed-color wheel never matches.
6. On a matching landing, core records the matched color and all consumed pearl IDs, increments the wheel clear count, clears all local slots, and emits exactly one `WHEEL_CLEARED` event in the same authoritative update.
7. The wheel's clear rule and rotation remain unchanged after clearing. It stays connected, rotatable, and can clear again.
8. Runtime may present a brief flash/burn from `WHEEL_CLEARED`, but it cannot delay, cause, or reverse the core clear.
9. Clicking an occupied slide-facing wheel slot queues ejection into the adjacent slide without checking the dispatcher or any other far-side state. The returning pearl burns at the dispatcher endpoint and cannot overwrite the dispatcher's held pearl.
10. Transit pearls use the same established rendered pearl diameter as wheel pearls.

## Acceptance Criteria

- `?test=test-8` opens the level without changing Tests 1-7.
- A full eight-pearl one-color fill emits one clear event and exposes an empty wheel snapshot with incremented clear count.
- Partial and mixed fills remain intact and do not emit a clear event.
- The browser debug surface exposes the clear rule, clear count, empty slots, and last clear event.
- The browser proves that an aligned wheel pearl can return through the adjacent slide and that transit/wheel pearl diameters match.
- Unit, integration, and Playwright coverage prove matching, rejection, atomic clearing, and two consecutive clears.

## Deterministic Implications

Core owns clear-rule evaluation immediately after authoritative transit landing. The rule is level data, the event includes explicit wheel ID, matched color, and consumed IDs, and snapshots expose a readonly clear count and rule. Runtime effects consume that event only.

## Level Or Content Notes

Uses `testReusableHarmonyWheelClear3x8Level` and the shared dispatcher-board world. The harmony rule is declared by the wheel component; it is not a scene or catalog special case.

## Required Tests

- unit: harmony match, partial/mixed rejection, consumed IDs, repeat clearing, and malformed rule validation
- integration: controller exposes the core clear result without owning its decision
- behavior: manually fill and clear the wheel twice through `globalThis.__PEARLS__` state conditions

## Open Questions

none
