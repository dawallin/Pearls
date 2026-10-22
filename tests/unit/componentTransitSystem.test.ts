import { describe, expect, it } from "vitest";
import { advanceComponentTransits, type ComponentTransitHost } from "../../src/core/board/componentTransitSystem";
import { createComponentConnectionState } from "../../src/core/board/componentConnectionState";
import type { ComponentTransitState } from "../../src/core/board/componentTransitState";
import type { ComponentTransitSegment } from "../../src/core/board/componentTransitRoute";
import { PEARL_DIAMETER_GRID_UNITS as diameter } from "../../src/core/geometry/physicalGeometry";

type Pearl = ComponentTransitState & { id: string };
function fixture(reverse = false, connected = true) {
  const segments: ComponentTransitSegment[] = [0, 1].map((index) => ({
    id: `segment:${index}`, componentId: `slide:${index}`, componentType: "verticalSlide", entryEdge: "north", exitEdge: "south",
    entry: { x: 0, y: index * 2000 }, exit: { x: 0, y: (index + 1) * 2000 }, length: 2000
  }));
  const connections = createComponentConnectionState(segments.flatMap((segment, i) => [
    { componentId: segment.componentId, exitEdge: "north" as const, endpoint: connected && i === 1 ? { kind: "component" as const, componentId: "slide:0", entryEdge: "south" as const } : { kind: "wheel" as const, wheelId: "top", entryEdge: "south" as const } },
    { componentId: segment.componentId, exitEdge: "south" as const, endpoint: connected && i === 0 ? { kind: "component" as const, componentId: "slide:1", entryEdge: "north" as const } : { kind: "wheel" as const, wheelId: "bottom", entryEdge: "north" as const } }
  ]));
  const pearls: Pearl[] = [];
  const events: unknown[] = [];
  const host: ComponentTransitHost<Pearl> = {
    transits: () => reverse ? [...pearls].reverse() : pearls, id: (p) => p.id,
    getSegment: (id) => segments.find((segment) => segment.componentId === id)!, connections, speed: 100,
    terminalClearance: () => 0,
    onTerminal: (pearl) => { events.push({ landed: pearl.id }); pearls.splice(pearls.indexOf(pearl), 1); },
    onHandoff: (pearl, from) => events.push({ handoff: pearl.id, from, to: pearl.currentComponentId }),
    onCollision: (a, b) => events.push({ collision: [a.id, b.id], contacts: [a, b].map((p) => ({ ...p })) })
  };
  const add = (id: string, component: number, progress: number, direction: "forward" | "back") => pearls.push({ id, currentComponentId: `slide:${component}`, localProgress: progress, direction, entryEdge: "north", previousEdge: "north" });
  return { host, pearls, events, add };
}

describe("component transit timeline", () => {
  it("collides inside a component before a fast pair could pass through or land", () => {
    const f = fixture(false, false); f.add("a", 0, 200, "forward"); f.add("b", 0, 1800, "back");
    advanceComponentTransits(f.host, 16);
    expect(f.events[0]).toMatchObject({ collision: ["a", "b"] });
    expect(f.events).toHaveLength(3); // collision, then both return to their outer ports
    expect(f.pearls).toHaveLength(0);
    const contact = f.events[0] as { contacts: Pearl[] };
    expect(contact.contacts[1].localProgress - contact.contacts[0].localProgress).toBeCloseTo(diameter, 8);
  });

  it("checks connected neighbours before either pearl hands off, independently of iteration order", () => {
    const run = (reverse: boolean) => {
      const f = fixture(reverse); f.add("a", 0, 1600, "forward"); f.add("b", 1, 400, "back");
      advanceComponentTransits(f.host, 2);
      expect(f.events).toHaveLength(1);
      expect(f.events[0]).toMatchObject({ collision: ["a", "b"], contacts: [{ currentComponentId: "slide:0" }, { currentComponentId: "slide:1" }] });
      expect(f.pearls.map((p) => p.direction)).toEqual(["back", "forward"]);
      return { pearls: f.pearls, events: f.events };
    };
    expect(run(false)).toEqual(run(true));
  });

  it("hands off once and uses remaining tick time in the receiving component", () => {
    const f = fixture(); f.add("a", 0, 1950, "forward");
    advanceComponentTransits(f.host, 2);
    expect(f.events).toEqual([{ handoff: "a", from: "slide:0", to: "slide:1" }]);
    expect(f.pearls[0]).toMatchObject({ currentComponentId: "slide:1", localProgress: 150 });
  });

  it("recalculates collision candidates after a handoff", () => {
    const f = fixture(); f.add("a", 0, 1950, "forward"); f.add("b", 1, 1500, "back");
    advanceComponentTransits(f.host, 6);
    expect(f.events).toHaveLength(2);
    expect(f.events[1]).toMatchObject({ collision: ["a", "b"], contacts: [{ currentComponentId: "slide:1" }, { currentComponentId: "slide:1" }] });
  });

  it("does not collide disconnected components even when their geometry touches", () => {
    const f = fixture(false, false); f.add("a", 0, 1600, "forward"); f.add("b", 1, 400, "back");
    advanceComponentTransits(f.host, 2);
    expect(f.events).toEqual([]);
  });

  it("does not collide pearls travelling together", () => {
    const f = fixture(); f.add("a", 0, 400, "forward"); f.add("b", 0, 1200, "forward");
    advanceComponentTransits(f.host, 2);
    expect(f.events).toEqual([]);
  });
});
