import { describe, expect, it } from "vitest";

import {
  advanceDispatchBoardTime,
  createDispatchBoardWorld,
  dispatchBall,
  ejectBallFromWheel,
  getDispatchBoardSnapshot,
  rotateWheelClockwise,
  setDispatchConnection,
  type DispatchBoardConfig,
  type DispatchBoardEvent
} from "../../src/core/board/dispatchBoardWorld";
import { testFixedPatternWheelClear3x8Level } from "../../src/core/levels/test/testFixedPatternWheelClear3x8Level";
import { testDispatcherSlideWheel3x8Level } from "../../src/core/levels/test/testDispatcherSlideWheel3x8Level";
import { setWheelWorldSlotOccupant } from "../../src/core/wheel/wheelState";
import { REFILL_DELAY_MS_BY_SPEED } from "../../src/core/board/refillSpeed";

const travelMs = 32;
function createWorld(overrides: Omit<DispatchBoardConfig, "wheelId" | "wheelSlotCount"> = {}) {
  return createDispatchBoardWorld({ dispatcherId: "dispatcher-a", slideId: "slide-a", wheelId: "wheel-a", wheelSlotCount: 8, transitTravelMs: travelMs, ...overrides });
}

describe("dispatchBoardWorld first-class transit", () => {
  it("queues dispatch and resolves its level-derived endpoint only at the component boundary", () => {
    const world = createWorld({ dispatcherHasInitialBall: true });

    expect(dispatchBall(world)).toEqual({ dispatcherId: "dispatcher-a", slideId: "slide-a", ball: { id: "dispatcher-a:ball", color: "red" } });
    expect(getDispatchBoardSnapshot(world)).toMatchObject({ tick: 0, activeTransits: [], dispatcher: { hasBall: true } });
    expect(advanceDispatchBoardTime(world, 16)).toMatchObject([{ type: "BALL_DISPATCHED", ballId: "dispatcher-a:ball", tick: 1 }]);
    expect(getDispatchBoardSnapshot(world).activeTransits).toMatchObject([{ currentComponentId: "slide-a", entryEdge: "north", direction: "forward", localProgress: 0.5 }]);

    const events = advanceDispatchBoardTime(world, 16);
    expect(events.map((event) => event.type)).toEqual(["TRANSIT_HANDOFF", "BALL_LANDED_IN_WHEEL"]);
    expect(getDispatchBoardSnapshot(world).activeTransits).toEqual([]);
  });

  it("rejects a connection endpoint that was not declared as an allowed topology option", () => {
    const world = createWorld();
    expect(() => setDispatchConnection(world, "slide-a", "south", {
      exitEdge: "south",
      endpoint: { kind: "dispatcher", dispatcherId: "dispatcher-a", entryEdge: "north" }
    })).toThrow("not a valid connection option");
  });

  it("traverses both level-derived slide components and emits a handoff for each boundary", () => {
    const world = createDispatchBoardWorld({
      level: testDispatcherSlideWheel3x8Level,
      dispatchers: [{ id: "dispatcher-01" }],
      wheelId: "wheel-01",
      wheelSlotCount: 8,
      transitTravelMs: 64
    });
    dispatchBall(world);
    advanceDispatchBoardTime(world, 64);
    expect(getDispatchBoardSnapshot(world).activeTransits).toMatchObject([{
      currentComponentId: "slide-01-b",
      entryEdge: "north",
      direction: "forward",
      segment: { componentId: "slide-01-b" }
    }]);
    const events = advanceDispatchBoardTime(world, 32);
    expect(getDispatchBoardSnapshot(world).lastEvents.filter((event) => event.type === "TRANSIT_HANDOFF")).toMatchObject([
      { componentId: "slide-01-a", endpoint: { kind: "component", componentId: "slide-01-b", entryEdge: "north" } },
      { componentId: "slide-01-b", endpoint: { kind: "wheel", wheelId: "wheel-01", entryEdge: "north" } }
    ]);
    expect(events.some((event) => event.type === "BALL_LANDED_IN_WHEEL")).toBe(true);
  });

  it("dispatches despite an occupied wheel, bounces, and burns at the origin after refill", () => {
    const world = createWorld({ initialBall: { id: "first", color: "red" }, refillQueue: [{ id: "second", color: "blue", refillSpeed: "fast" }, { id: "third", color: "green", refillSpeed: "fast" }] });
    dispatchBall(world);
    advanceDispatchBoardTime(world, travelMs);
    advanceDispatchBoardTime(world, REFILL_DELAY_MS_BY_SPEED.fast);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({ id: "second", color: "blue" });
    dispatchBall(world);
    const events = advanceDispatchBoardTime(world, REFILL_DELAY_MS_BY_SPEED.fast + travelMs * 3);
    expect(events.map((event) => event.type)).toContain("BALL_BOUNCED");
    expect(events).toContainEqual(expect.objectContaining({ type: "BALL_BURNED_AT_DISPATCHER", ballId: "second", dispatcherId: "dispatcher-a", color: "blue" }));
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({ id: "third", color: "green" });
  });

  it("collides Test 9 wheel and dispatcher pearls, then burns the return without stopping refills", () => {
    const level = testFixedPatternWheelClear3x8Level;
    const component = level.cells[0].component;
    if (component.type !== "dispatcherDown") throw new Error("Expected dispatcher.");
    const world = createDispatchBoardWorld({ level, wheelId: "wheel-01", wheelSlotCount: 8, dispatchers: [{ id: component.id, initialBall: component.initialBall, refillQueue: component.refillQueue }] });
    dispatchBall(world);
    advanceDispatchBoardTime(world, 800);
    const first = getDispatchBoardSnapshot(world).wheel.slotBallIds[0]!;
    const second = getDispatchBoardSnapshot(world).dispatcher.ball!.id;
    dispatchBall(world);
    advanceDispatchBoardTime(world, 16);
    expect(ejectBallFromWheel(world, 0)).not.toBeNull();
    const events = advanceDispatchBoardTime(world, 1600);
    expect(events.filter((event) => event.type === "BALL_COLLIDED")).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ type: "BALL_COLLIDED", ballIds: [first, second].sort() }));
    expect(events).toContainEqual(expect.objectContaining({ type: "BALL_BURNED_AT_DISPATCHER", ballId: second }));
    const settled = getDispatchBoardSnapshot(world);
    expect(settled.wheel.slotBallIds[0]).toBe(first);
    expect(settled.activeTransits).toEqual([]);
    expect(settled.dispatcher.ball?.id).toBe("ball-red-03");
    ejectBallFromWheel(world, 0);
    advanceDispatchBoardTime(world, 1000);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball?.id).toBe("ball-red-03");
    expect(dispatchBall(world)).not.toBeNull();
    advanceDispatchBoardTime(world, 1000);
    expect(getDispatchBoardSnapshot(world).wheel.slotBallIds[0]).toBe("ball-red-03");
    expect(getDispatchBoardSnapshot(world).dispatcher.ball?.id).toBe("ball-red-04");
  });

  it("ejects an aligned wheel pearl into the adjacent slide without inspecting the dispatcher", () => {
    const world = createWorld({
      initialBall: { id: "first", color: "red" },
      refillQueue: [{ id: "held-at-dispatcher", color: "blue", refillSpeed: "fast" }]
    });
    dispatchBall(world);
    advanceDispatchBoardTime(world, travelMs);
    advanceDispatchBoardTime(world, REFILL_DELAY_MS_BY_SPEED.fast);
    expect(getDispatchBoardSnapshot(world)).toMatchObject({
      dispatcher: { ball: { id: "held-at-dispatcher" } },
      wheel: { slotBallIds: ["first", null, null, null, null, null, null, null] }
    });

    expect(ejectBallFromWheel(world, 0)).toEqual({ wheelId: "wheel-a", ball: { id: "first", color: "red" } });
    expect(getDispatchBoardSnapshot(world).wheel.slotBallIds[0]).toBe("first");
    const events = advanceDispatchBoardTime(world, travelMs * 2);

    expect(events[0]).toMatchObject({ type: "BALL_EJECTED_FROM_WHEEL", wheelId: "wheel-a", ballId: "first" });
    expect(events).toContainEqual(expect.objectContaining({ type: "BALL_BURNED_AT_DISPATCHER", ballId: "first", dispatcherId: "dispatcher-a" }));
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({ id: "held-at-dispatcher", color: "blue" });
    expect(getDispatchBoardSnapshot(world).wheel.slotBallIds).toEqual(Array(8).fill(null));
  });

  it("advances multiple transits in stable ball-ID order", () => {
    const world = createWorld({ dispatchers: [
      { id: "dispatcher-z", slideId: "slide-z", initialBall: { id: "z-ball", color: "red" }, connectedWorldSlotIndex: 0 },
      { id: "dispatcher-a", slideId: "slide-a", initialBall: { id: "a-ball", color: "blue" }, connectedWorldSlotIndex: 1 }
    ] });
    dispatchBall(world, "dispatcher-z");
    dispatchBall(world, "dispatcher-a");
    const events = advanceDispatchBoardTime(world, travelMs);
    expect(events.filter((event) => event.type === "TRANSIT_HANDOFF").map((event) => event.ballId)).toEqual(["a-ball", "z-ball"]);
    expect(getDispatchBoardSnapshot(world).wheel.slotBallIds.filter(Boolean)).toEqual(["z-ball", "a-ball"]);
  });

  it("evaluates harmony clearing only after the eighth real landing", () => {
    const world = createWorld({ wheelClearRule: { type: "harmony" }, initialBall: { id: "ball-01", color: "red" }, refillQueue: Array.from({ length: 7 }, (_, index) => ({ id: `ball-${String(index + 2).padStart(2, "0")}`, color: "red" as const, refillSpeed: "fast" as const })) });
    let events: readonly DispatchBoardEvent[] = [];
    for (let index = 0; index < 8; index += 1) {
      dispatchBall(world);
      events = advanceDispatchBoardTime(world, travelMs);
      if (index < 7) {
        rotateWheelClockwise(world);
        advanceDispatchBoardTime(world, 16);
        advanceDispatchBoardTime(world, REFILL_DELAY_MS_BY_SPEED.fast);
      }
    }
    expect(events).toContainEqual(expect.objectContaining({ type: "WHEEL_CLEARED", clearCount: 1, color: "red" }));
    expect(getDispatchBoardSnapshot(world).wheel.slots).toEqual(Array(8).fill(null));
  });

  it("applies queued wheel rotation at tick start and maps arrival using that tick's rotation", () => {
    const world = createWorld({ dispatcherHasInitialBall: true });
    dispatchBall(world);
    expect(rotateWheelClockwise(world)).toMatchObject({ rotationStep: 1 });
    expect(getDispatchBoardSnapshot(world)).toMatchObject({ tick: 0, wheel: { rotationStep: 0 } });
    const firstTick = advanceDispatchBoardTime(world, 16);
    expect(firstTick.map((event) => event.type)).toEqual(["BALL_DISPATCHED", "WHEEL_ROTATED"]);
    advanceDispatchBoardTime(world, 16);
    expect(getDispatchBoardSnapshot(world).wheel).toMatchObject({ rotationStep: 1, ballLocalSlotIndex: 7 });
  });

  it("preserves the complete ordered event stream regardless of frame partitioning", () => {
    const config = { initialBall: { id: "first", color: "red" as const }, refillQueue: [{ id: "second", color: "blue" as const, refillSpeed: "fast" as const }] };
    const singleFrame = createWorld(config);
    const partitioned = createWorld(config);
    dispatchBall(singleFrame);
    dispatchBall(partitioned);

    const singleEvents = advanceDispatchBoardTime(singleFrame, 320);
    const partitionedEvents: DispatchBoardEvent[] = [];
    for (let elapsed = 0; elapsed < 320; elapsed += 1) partitionedEvents.push(...advanceDispatchBoardTime(partitioned, 1));

    expect(singleEvents).toEqual(partitionedEvents);
    expect(getDispatchBoardSnapshot(singleFrame)).toEqual(getDispatchBoardSnapshot(partitioned));
    expect(singleEvents.map((event) => event.type)).toEqual(["BALL_DISPATCHED", "TRANSIT_HANDOFF", "BALL_LANDED_IN_WHEEL", "DISPATCHER_REFILLED"]);
  });

  it("does not rewind progress when wheel occupancy appears after contact was already passed", () => {
    const world = createWorld({ transitTravelMs: 160, dispatcherHasInitialBall: true });
    dispatchBall(world);
    advanceDispatchBoardTime(world, 144);
    const before = getDispatchBoardSnapshot(world).activeTransits[0].localProgress;
    expect(before).toBeCloseTo(0.9, 8);
    world.balls.blocker = { id: "blocker", color: "blue" };
    setWheelWorldSlotOccupant(world.wheel, 0, "blocker");

    const events = advanceDispatchBoardTime(world, 16);
    const bounce = events.find((event) => event.type === "BALL_BOUNCED");
    expect(bounce).toMatchObject({ type: "BALL_BOUNCED", localProgress: before });
    expect(getDispatchBoardSnapshot(world).activeTransits[0].localProgress).toBeLessThan(before);
  });
});
