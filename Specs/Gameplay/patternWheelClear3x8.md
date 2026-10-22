# Fixed-Pattern Wheel Clear 3x8

## Purpose

Define Test 9: fill an eight-slot wheel so each pearl matches the color target attached to its local slot.

## Status

accepted

## Scope

In scope:

- a `3x8` dispatcher-slide-wheel test level
- one reusable eight-slot pattern wheel
- an authored eight-pearl sequence repeated twice to prove wheel reuse
- visible per-slot color targets that rotate with the wheel
- atomic clearing when every local slot matches its target

Out of scope:

- scoring, progression, failure states, or automatic dispatch
- random pearl queues or generated patterns
- changing the target pattern after a clear
- new final art or audio

## Player-Visible Behavior

The player dispatches pearls manually and rotates the wheel between placements. Each wheel hole has a visible target color attached to that local hole. The wheel clears only when all eight holes contain pearls matching their targets. A correct arrangement burns away and leaves the same empty, reusable pattern wheel.

## Rules

1. The board is a `3x8` test level with one down-facing dispatcher, two vertical slides, and one eight-slot wheel.
2. The wheel's target colors by local slot index `0..7` are blue, blue, green, green, green, red, red, red.
3. The dispatcher supplies the deterministic sequence blue, red, red, red, green, green, green, blue twice, with unique pearl IDs; dispatch remains manual.
4. The dispatcher begins with the first blue pearl. Each subsequent pearl refills at `fast` speed, matching Test 8. Exact duration is owned by the deterministic core.
5. The wheel connects to the slide at world slot `0` and begins at rotation step `0`.
6. Target colors belong to local wheel slots. Rotating the wheel moves each target with its slot; pearl-to-target matching is evaluated in local-slot order.
7. A partial wheel never matches. A full wheel matches only when every slot is occupied and each pearl color equals that slot's target color.
8. Matching color totals are insufficient: a full arrangement with any pearl in the wrong target slot does not clear.
9. On a matching placement, the core records all consumed pearl IDs, increments the clear count, empties all slots, and emits one `WHEEL_CLEARED` event atomically.
10. The target pattern remains unchanged after clearing, and the wheel remains connected and reusable.
11. Runtime keeps the wheel holes black and draws a tapered, target-colored U on the wood just outside each hole. The U is widest at its lower center, narrows toward its ends, is oriented with its slot, and remains visible around an occupied pearl. Clear visuals consume the core event and cannot determine whether the wheel clears.
12. A straightforward solution is to place the initial blue pearl at local slot 0, then rotate clockwise once between each later placement. The resulting local-slot order matches the target pattern.

## Acceptance Criteria

- `?test=test-9` opens the new level without changing Tests 1–8.
- The level data declares the exact target pattern and the authored pearl sequence repeated twice with unique IDs.
- Level construction rejects a pattern whose number of target colors differs from the wheel's slot count or contains an unsupported color.
- Debug snapshots expose target colors in local-slot order, pearl IDs/colors, clear count, and the last clear event.
- Each black slot has a tapered target-colored U on the surrounding wood, widest at its lower center; the accent follows its local slot through wheel rotation and remains visible around an occupied pearl.
- A partial arrangement and a full wrong-position arrangement do not clear.
- The exact arrangement emits one clear event, consumes all eight pearls, and leaves the same pattern on an empty wheel.
- The wheel can be filled and cleared again.
- Unit, integration, and Playwright tests prove matching, mismatch, rotation, atomic clearing, and reuse while preserving Tests 1–8.

## Deterministic Implications

The clear rule is level data and is evaluated by core after an authoritative wheel landing. Core compares each local slot's pearl color with its corresponding target color. Rotation changes world-to-local mapping but does not change the stored target or pearl in a local slot. Core owns consumed IDs, clear count, slot clearing, and event emission; runtime only presents the result.

## Level Or Content Notes

Uses `testFixedPatternWheelClear3x8Level`. The target pattern and queue are authored in that level definition. The shared wheel-clear pipeline from Test 8 handles the clear event and reuse behavior.

## Required Tests

- unit: exact local-slot match; partial and wrong-position rejection, including equal color counts; target-length and color validation; repeat clear
- integration: level target pattern and queue reach core snapshots and the runtime controller without runtime-owned matching
- behavior: verify target indicators rotate with local slots, solve the authored arrangement, verify a mismatch does not clear, and clear the wheel twice
- regression: dispatch a second pearl and eject the first from the aligned wheel slot; require one collision, reversal, return burning of the second pearl, preserved first pearl, and a usable dispatcher with continued deterministic refill

## Open Questions

none
