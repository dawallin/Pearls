# Pearls Platform Spec

## Status

Accepted on May 3, 2026.

This spec defines the recommended technical platform for the first implementation phase of Pearls.

It complements `Specs/Foundation/MainIdea.md` and does not replace it.

## Decision Summary

Pearls should start on this stack:

- `TypeScript`
- `Vite`
- `Phaser`
- `Vitest`
- `Playwright`
- `GitHub Pages` for static deployment

This means:

- the deterministic game logic is implemented in plain TypeScript
- the browser runtime is implemented with Phaser
- local development and production builds use Vite
- core logic is tested with Vitest
- runtime and smoke flows are tested with Playwright

## Why This Stack

### Primary goal

The first platform must optimize for:

- deterministic logic
- fast iteration
- low platform complexity
- strong testability
- safe mobile delivery in a browser

### Why Vite

Vite fits Pearls because it provides:

- a fast local dev server
- a production build for static hosting
- straightforward TypeScript project setup
- good alignment with Vitest
- correct handling of nested base paths for GitHub Pages deployments

As of May 3, 2026, Vite documentation requires `Node.js 20.19+` or `22.12+`.

Pearls should prefer `Node 24 LTS` rather than merely meeting the minimum supported version, because LTS is the safer default for tool compatibility, CI stability, and collaboration.

### Why Phaser

Phaser is the recommended runtime because Pearls needs more than rendering:

- scene management
- unified desktop and mobile input
- asset loading
- tween support
- a game-oriented lifecycle

This reduces platform code that would otherwise have to be built around a thinner renderer.

### Why not Pixi as the default

PixiJS remains a valid fallback if the project later wants a thinner custom runtime.

It is not the first choice because Pearls currently benefits more from:

- built-in scene structure
- built-in loader conventions
- built-in game input patterns

than from a minimal rendering layer.

### Why Vitest

Vitest is the preferred unit test runner because it matches the Vite toolchain and keeps core tests close to the app build pipeline.

### Why Playwright

Playwright is the preferred end-to-end test tool because Pearls needs real browser verification for:

- input wiring
- scene startup
- debug hooks
- deterministic runtime smoke tests

## Hard Platform Decisions

These decisions are locked for the first implementation phase.

### Language

Use `TypeScript` across core, runtime, config, and tests.

### Build tool

Use `Vite`.

### Runtime framework

Use `Phaser`.

### Unit test runner

Use `Vitest`.

### Browser e2e test runner

Use `Playwright`.

### Deployment target

Use `GitHub Pages` with static output in `dist/`.

### Node version policy

Pin the repo to `Node 24 LTS`.

Practical recommendation:

- use a `.nvmrc` or equivalent version file
- set the same version family in CI
- allow newer Current releases only as an explicit choice, not the default

## Architecture Requirements

The platform implementation must preserve these rules from `Specs/Foundation/MainIdea.md`.

### Core

The core must:

- be framework-agnostic
- avoid DOM and browser APIs
- advance only through explicit fixed ticks
- expose deterministic state and events
- remain testable in isolation

The core must not:

- import Phaser
- depend on `requestAnimationFrame`
- use wall-clock time as simulation truth

### Runtime

The runtime must:

- own rendering, input, audio, assets, and debug UI
- translate input into discrete core commands
- treat core state and events as the source of truth
- use interpolation only for presentation

The runtime must not:

- decide game outcomes from animation completion
- store authoritative logic inside scene-only objects

## Recommended Initial Repo Shape

This is the recommended first code layout once scaffolding begins:

```text
src/
  core/
    model/
    rules/
    events/
    commands/
    world/
  runtime/
    game/
    scenes/
    render/
    input/
    audio/
    debug/
  shared/
    types/
    math/
tests/
  core/
  e2e/
public/
```

Guidance:

- keep `src/core` free of Phaser imports
- keep `src/runtime` free to depend on Phaser
- keep shared utilities narrow and deliberate

## Recommended Startup Scope

The first implementation milestone should include:

1. Vite TypeScript app booting in browser
2. Phaser runtime shell with one boot or play scene
3. core world with fixed-step tick loop
4. command queue boundary between runtime and core
5. event stream with at least send, arrive, bounce, land, rotate
6. Vitest coverage for deterministic core rules
7. Playwright smoke test for one controlled browser scenario
8. debug overlay or test hook surface sufficient for runtime inspection

## Package-Level Recommendations

The first scaffold should prefer a small dependency set.

### Required

- `vite`
- `typescript`
- `phaser`
- `vitest`
- `@playwright/test`

### Expected supporting tools

- `eslint`
- `prettier`

### Avoid initially

- React
- state management libraries
- ECS frameworks
- physics engines
- UI component libraries

These may be added later only when a real need appears.

## Deployment Requirements

The build must support GitHub Pages project-site hosting.

Implementation requirements:

- `vite build` outputs to `dist/`
- Vite `base` is configured correctly for `/<repo>/` hosting
- runtime asset paths respect the configured base path

### Recorded findings from deployment debugging

The first real deployment surfaced several concrete GitHub Pages constraints that must be preserved.

- GitHub Pages must publish the built `dist/` artifact, not the repository root.
- The Pages workflow should use `GitHub Actions` and upload `./dist`.
- A generic static Pages workflow that uploads `.` is incorrect for this repo because it serves source `index.html` instead of the Vite build output.
- For the current hosting setup, Pearls is a GitHub Pages project site hosted at `/<repo>/`, not at the custom-domain root.
- If the custom domain root is already serving a different site, Pearls must keep the Vite `base` aligned to `/<repo>/` so emitted asset URLs resolve under that path.
- Forcing the Pages build to emit root-based asset URLs such as `/assets/...` breaks the deployed app when the site is actually hosted under `/<repo>/`.
- A custom domain can still front a project site path, for example `https://www.dawallin.com/Pearls/`; this does not mean the app is hosted at `https://www.dawallin.com/`.
- When debugging Pages failures, verify both the deployed HTML location and the emitted asset URLs before changing Vite `base`.

## Testing Requirements

### Core tests

Vitest must cover:

- slot mapping
- wheel rotation effects
- bounce behavior
- simultaneous arrival ordering
- command application at tick boundaries

### Browser tests

Playwright must cover at least one deterministic smoke scenario:

- load app
- initialize a known test state
- force a bounce case
- free a slot
- confirm eventual landing

### Test hooks

The runtime may expose a test-only browser hook such as `window.__PEARLS__`, but:

- it must be intentional
- it must not become the main architecture
- it should be easy to disable or gate outside dev and test

## Non-Goals For This Phase

This platform spec does not yet decide:

- final asset art pipeline
- audio pipeline details
- save system format
- localization
- analytics
- monetization
- native wrappers

It also does not require:

- multiplayer
- server infrastructure
- backend services

## Revisit Triggers

This platform decision should be revisited only if one of these becomes true:

- Phaser creates unacceptable constraints for rendering or input
- the game needs a thinner custom runtime than Phaser justifies
- deployment target changes away from static hosting
- the test strategy requires a different packaging model

Until one of those happens, the stack should remain stable.

## Acceptance Criteria

This spec is satisfied when the repo can be scaffolded with:

- a Vite + TypeScript project
- Phaser booting in browser
- a core module with no browser dependencies
- Vitest running core tests
- Playwright running at least one browser smoke test
- a build that is compatible with GitHub Pages nested hosting
