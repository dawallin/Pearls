# Multi-Pearl Collision 3x10

## Purpose

Define Test 7: two differently coloured pearls travelling from opposite wheels on one vertical slide path.

## Status

accepted

## Scope

A `3x10` test board with two `3x3` wheels, four vertical slide cells, two initial pearls, and one opposing-pair collision. Branches, three-way contact, unequal speeds, and initially overlapping transits are out of scope.

## Player-Visible Behavior

The top red and bottom blue pearls can be launched while the other is travelling. They meet, reverse visibly, and return to their now-empty original wheel slots.

## Rules

1. The top red pearl starts in the top wheel's slide-facing slot; the blue pearl starts in the bottom equivalent.
2. A valid launch removes only its pearl from its wheel and does not block a valid launch from the other wheel.
3. Opposing pearls reverse at a deterministic contact clearance before their visual centres overlap, and retain their IDs and colours.
4. Same-direction pearls do not collide.
5. Endpoint landing and occupied-endpoint bounce are core rules. Wheels may rotate while transit is active: placed component geometry remains world-fixed, and arrival resolves against the destination's connected world slot after preceding rotations.

## Acceptance Criteria

- `?test=test-7` opens the `3x10` board without changing Tests 1–6.
- Debug snapshots expose active pearl transit IDs, colours, current component/segment geometry, local progress, direction, and collision events; they do not expose a future route index as transit authority.
- Core and browser coverage prove collision, reversal, identity preservation, return landing, and second launch acceptance.

## Deterministic Implications

Core stores active transits keyed by stable pearl ID. Every level uses the shared `16 ms` core tick and a shared physical speed. The component catalog and port-compatible connection graph are derived from placed slides, wheel connection slots, and shared pearl/wheel geometry; levels do not supply collision distances. Each transit stores only its current component and local facts. Runtime converts frame deltas into fixed ticks and projects component-local positions without correction. Collision contact is calculated from core component geometry, including contact across a shared component boundary, and stable ordering emits `BALL_COLLIDED` with both IDs and component-local contacts.

Test transfer boards may expose a runtime speed dial (`0.25×`, `0.5×`, `1×`, `2×`) for inspection. It scales the runtime's frame-time contribution to the fixed-tick accumulator and Phaser presentation tweens, including wheel-turn animation; it does not alter core physics, tick size, or level data.

## Level Or Content Notes

Uses `testMultiPearlCollision3x10Level`.

## Required Tests

- unit: deterministic pair collision, no pass-through, same-direction non-collision, endpoint landing
- integration: second launch while a first transit is active
- behavior: launch both pearls and observe collision then settlement through debug snapshots

## Open Questions

none
