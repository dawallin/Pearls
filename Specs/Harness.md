# Pearls Harness

## Decision

Start with a single-threaded AI harness that switches between specialist skills.

Do not start with a full multi-agent workflow.

## Why

- The repo is still at the specification stage.
- Core contracts are still being defined.
- Parallel agents create more coordination cost than speed when interfaces are moving.
- The most important early work is preserving architectural rigor, not maximizing concurrency.

## Operating Model

One orchestrator should:

1. read the relevant spec
2. choose the correct specialist role
3. implement or update the requested slice
4. pull in another specialist skill when the task changes shape

Specialist roles:

- product owner
- core engineer
- runtime engineer
- test engineer

The product owner is responsible for clarifying:

- player goal
- game rules and constraints
- success and failure states
- acceptance criteria
- unresolved design questions that must be answered before implementation

## When To Introduce Subagents

Add subagents only after the repo has:

- a stable core API
- a chosen runtime stack
- a real test harness
- tasks that can be split into disjoint write scopes

Recommended first use cases:

- one agent implements runtime UI while another writes tests against a frozen API
- one agent performs review or triage while the main agent integrates code

## Non-Goals

The harness does not yet:

- lock the runtime library choice
- define CI files
- define code generation templates
- replace specs as the source of truth
