# Dispatcher Component Transit 3x8

## Purpose

Define deterministic first-class pearl transit from a dispatcher through a placed component toward a wheel.

## Status

accepted

## Rules

1. Dispatch removes the held pearl, creates a core-owned active transit, and schedules deterministic refill immediately.
2. A transit records its pearl identity and color, origin dispatcher, active component, entry and previous edges, direction, local progress, and current endpoint intent.
3. The next endpoint is resolved from current core connection state only at the component boundary. A future route is not committed at ejection.
4. At a wheel boundary, core maps the connected world slot using the wheel rotation at that arrival tick. An empty slot lands; an occupied slot reverses the transit.
5. A reversed transit reaching its origin burns, even if that dispatcher has since refilled. The burn removes the pearl and emits `BALL_BURNED_AT_DISPATCHER`.
6. Active transits advance and resolve in stable pearl-ID order. Runtime projection and animation cannot decide handoffs, landing, bounce, or burn.
7. Harmony clearing evaluates only after a successful wheel landing.
8. Any element may eject an aligned pearl into its directly adjacent slide using only the source-side port relationship. It must not inspect or precommit the slide's far endpoint.
9. In Test 8, clicking a pearl in the wheel's slide-facing slot ejects it back through the slide. When it reaches the dispatcher endpoint it burns without replacing or blocking the pearl currently held by that dispatcher.
10. Dispatch, wheel ejection, wheel rotation, and connection-state changes are commands applied only at the beginning of a fixed core tick.

## Required Tests

- unit: dynamic endpoint resolution, physical port validation, independent dispatch/refill, source-only wheel ejection, occupied-wheel bounce, burn after refill, stable ordering, and landing-triggered harmony clear
- integration: controller snapshots project multiple active core transits without animation authority
- behavior: debug snapshots prove blocked dispatch bounce/burn and wheel-to-slide-to-dispatcher ejection without canvas-pixel or sleep assertions
