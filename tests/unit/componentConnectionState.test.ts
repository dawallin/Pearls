import { describe, expect, it } from "vitest";

import {
  createComponentConnectionState,
  resolveComponentConnection,
  setComponentConnection
} from "../../src/core/board/componentConnectionState";
import type { ComponentTransitSegment } from "../../src/core/board/componentTransitRoute";

const source: ComponentTransitSegment = {
  id: "segment:source",
  componentId: "source",
  componentType: "verticalSlide",
  entryEdge: "north",
  exitEdge: "south",
  entry: { x: 0, y: -1 },
  exit: { x: 0, y: 0 },
  length: 1
};
// This is a deliberately abstract resolver seam, not an authorable level fixture:
// the current straight-slide catalog has no non-overlapping physical branch component.
const abstractBranchA: ComponentTransitSegment = {
  id: "segment:branch-a",
  componentId: "branch-a",
  componentType: "verticalSlide",
  entryEdge: "north",
  exitEdge: "south",
  entry: { x: 0, y: 0 },
  exit: { x: 0, y: 1 },
  length: 1
};
const abstractBranchB: ComponentTransitSegment = {
  ...abstractBranchA,
  id: "segment:branch-b",
  componentId: "branch-b"
};

describe("component connection state", () => {
  it("selects a different declared abstract endpoint from current connection state", () => {
    const alternate = { kind: "component" as const, componentId: "branch-b", entryEdge: "north" as const };
    const state = createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "component", componentId: "branch-a", entryEdge: "north" } }],
      [{ componentId: "source", exitEdge: "south", endpoint: alternate }],
      [source, abstractBranchA, abstractBranchB]
    );

    setComponentConnection(state, "source", "south", alternate);
    expect(resolveComponentConnection(state, "source", "south")).toEqual(alternate);
  });

  it("rejects declared options whose ports face the same way or are not colocated", () => {
    expect(() => createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "component", componentId: "branch-a", entryEdge: "north" } }],
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "component", componentId: "branch-a", entryEdge: "south" } }],
      [source, abstractBranchA]
    )).toThrow("physically compatible");

    expect(() => createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "component", componentId: "branch-a", entryEdge: "north" } }],
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "component", componentId: "far-branch", entryEdge: "north" } }],
      [source, abstractBranchA, { ...abstractBranchA, id: "segment:far-branch", componentId: "far-branch", entry: { x: 2, y: 0 }, exit: { x: 2, y: 1 } }]
    )).toThrow("physically compatible");
  });

  it("rejects a known terminal with a non-adjacent or incorrectly oriented port", () => {
    const terminalPorts = [{ kind: "wheel" as const, id: "wheel-a", edge: "north" as const, point: { x: 0, y: 0 } }];
    expect(() => createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "wheel", wheelId: "wheel-a", entryEdge: "south" } }],
      [],
      [source],
      terminalPorts
    )).toThrow("physically compatible");

    expect(() => createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "wheel", wheelId: "wheel-a", entryEdge: "north" } }],
      [],
      [source],
      [{ ...terminalPorts[0], edge: "north", point: { x: 2, y: 0 } }]
    )).toThrow("physically compatible");

    expect(() => createComponentConnectionState(
      [{ componentId: "source", exitEdge: "south", endpoint: { kind: "dispatcher", dispatcherId: "dispatcher-a", entryEdge: "south" } }],
      [],
      [source],
      [{ kind: "dispatcher", id: "dispatcher-a", edge: "north", point: { x: 0, y: 0 } }]
    )).toThrow("physically compatible");
  });
});
