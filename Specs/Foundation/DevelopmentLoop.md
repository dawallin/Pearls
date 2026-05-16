# Pearls Development Loop

## Purpose

This spec defines the repo-wide development and regression loop for Pearls.

It is a foundation workflow spec, not a feature spec.

## Core Principle

Behavior must be defined in specs, proved in tests, and implemented in code.

If code changes without the matching spec or test update when required, that is drift.

## Local-First Rule

The primary Ralph loop is local.

CI is a safety net and merge gate, not the first place behavior is verified.

The local command surface should stay aligned with CI as closely as possible.

## Required Validation Layers

Pearls should validate behavior in layers:

1. `typecheck`
2. `unit tests`
3. `integration tests`
4. `behavior tests`

Fast deterministic tests should catch most regressions before browser tests do.

## Command Surface

The repo should preserve a small stable command surface for local validation:

- `npm run test:fast` for the inner local loop
- `npm run test:all` for the full local pre-push loop

If these commands change, CI should be updated to use the same contract.

## Behavior Rule

Every new player-visible behavior should be backed by test updates appropriate to its scope.

As a default expectation:

- new deterministic rules should add or update unit tests
- new cross-module behavior should add or update integration tests
- new player-visible flows should add or update behavior tests

## Test Level Rule

When a new mechanic is introduced, prefer proving it first with a minimal test level rather than only through a large game level.

This keeps regressions easier to isolate and makes behavior intent clearer.

## Review Loop

The expected role loop is:

1. product clarifies behavior and acceptance criteria
2. architect protects boundaries and extension seams
3. engineering implements the change
4. test engineering adds or tightens proof
5. local validation runs before push

Not every task needs a different person or agent at each step, but every step must be covered.

## Drift Rule

A change should be treated as drift if it:

- hard-codes behavior that belongs in a spec or level definition
- bypasses deterministic contracts for convenience
- changes behavior without updating the relevant tests
- adds runtime-only truth that the core cannot prove
