import { describe, expect, it } from "vitest";

import { DispatchBoardController } from "../../src/runtime/game/DispatchBoardController";
import { testFixedPatternWheelClear3x8Level } from "../../src/core/levels/test/testFixedPatternWheelClear3x8Level";

describe("DispatchBoardController", () => {
  it("projects fixed local-slot targets from level data into the runtime snapshot", () => {
    const wheelCell = testFixedPatternWheelClear3x8Level.cells.find((cell) => cell.component.type === "wheel");
    if (!wheelCell || wheelCell.component.type !== "wheel") throw new Error("Expected Test 9 to define a wheel.");
    const controller = new DispatchBoardController({
      level: testFixedPatternWheelClear3x8Level,
      dispatchers: [{ id: "dispatcher-01" }],
      wheelId: "wheel-01",
      wheelSlotCount: 8,
      wheelClearRule: wheelCell.component.clearRule
    });

    expect(controller.getSnapshot().wheel).toMatchObject({
      clearRule: {
        type: "pattern",
        targetColors: ["blue", "blue", "green", "green", "green", "red", "red", "red"]
      },
      targetColors: ["blue", "blue", "green", "green", "green", "red", "red", "red"],
      clearCount: 0,
      lastClearEvent: null
    });
  });

  it("projects core-owned active transits without treating animation completion as truth", () => {
    const controller = new DispatchBoardController({ dispatcherId: "dispatcher-a", slideId: "slide-a", wheelId: "wheel-a", wheelSlotCount: 8, transitTravelMs: 32, dispatcherHasInitialBall: true });
    expect(controller.requestDispatch()).toEqual({ dispatcherId: "dispatcher-a", slideId: "slide-a", ball: { id: "dispatcher-a:ball", color: "red" } });
    controller.completeDispatchAnimation();
    expect(controller.getSnapshot()).toMatchObject({ tick: 0, transitInProgress: true, activeTransits: [], wheel: { slots: Array(8).fill(null) } });
    controller.advanceTime(16);
    expect(controller.getSnapshot()).toMatchObject({ tick: 1, transitInProgress: true, activeTransits: [{ ball: { id: "dispatcher-a:ball" }, localProgress: 0.5 }] });
    controller.advanceTime(16);
    expect(controller.getSnapshot()).toMatchObject({ transitInProgress: false, activeTransits: [], wheel: { ballLocalSlotIndex: 0 } });
  });

  it("allows a refilled dispatcher to launch another pearl while the first is in flight", () => {
    const controller = new DispatchBoardController({ dispatcherId: "dispatcher-a", slideId: "slide-a", wheelId: "wheel-a", wheelSlotCount: 8, transitTravelMs: 1000, initialBall: { id: "first", color: "red" }, refillQueue: [{ id: "second", color: "blue", refillSpeed: "fast" }] });
    controller.requestDispatch(); controller.advanceTime(272);
    expect(controller.getSnapshot().dispatcher.ball).toEqual({ id: "second", color: "blue" });
    expect(controller.requestDispatch()).toMatchObject({ ball: { id: "second", color: "blue" } });
    controller.advanceTime(16);
    expect(controller.getSnapshot().activeTransits.map((transit) => transit.ball.id)).toEqual(["first", "second"]);
  });

  it("keeps wheel rotation a presentation queue while the core decides arrival at its later tick", () => {
    const controller = new DispatchBoardController({ dispatcherId: "dispatcher-a", slideId: "slide-a", wheelId: "wheel-a", wheelSlotCount: 8, transitTravelMs: 32, dispatcherHasInitialBall: true });
    controller.requestDispatch();
    expect(controller.requestRotateWheel()).toMatchObject({ rotationStep: 1 });
    controller.completeWheelAnimation(); controller.advanceTime(32);
    expect(controller.getSnapshot().wheel).toMatchObject({ rotationStep: 1, ballLocalSlotIndex: 7 });
  });

  it("projects shared collision and return burn while the dispatcher remains usable", () => {
    const level = testFixedPatternWheelClear3x8Level;
    const source = level.cells[0].component;
    if (source.type !== "dispatcherDown") throw new Error("Expected dispatcher.");
    const controller = new DispatchBoardController({ level, wheelId: "wheel-01", wheelSlotCount: 8, dispatchers: [{ id: source.id, initialBall: source.initialBall, refillQueue: source.refillQueue }] });
    controller.requestDispatch();
    controller.advanceTime(1000);
    controller.requestDispatch();
    controller.requestWheelEjection(0);
    controller.completeDispatchAnimation();
    const events = controller.advanceTime(1600);
    expect(events.filter((event) => event.type === "BALL_COLLIDED")).toHaveLength(1);
    expect(controller.getSnapshot()).toMatchObject({
      activeTransits: [], transitInProgress: false,
      wheel: { slotBallIds: ["ball-blue-01", null, null, null, null, null, null, null] },
      dispatcher: { ball: { id: "ball-red-03" } }, lastBurnEvent: { ballId: "ball-red-02" }
    });
  });

  it("queues wheel pearl ejection independently of the downstream dispatcher state", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      transitTravelMs: 32,
      initialBall: { id: "first", color: "red" },
      refillQueue: [{ id: "second", color: "blue", refillSpeed: "fast" }]
    });
    controller.requestDispatch();
    controller.advanceTime(32);
    controller.advanceTime(256);

    expect(controller.requestWheelEjection(0)).toEqual({ wheelId: "wheel-a", ball: { id: "first", color: "red" } });
    expect(controller.getSnapshot()).toMatchObject({ wheel: { ballLocalSlotIndex: 0 }, dispatcher: { ball: { id: "second" } } });
    controller.advanceTime(64);
    expect(controller.getSnapshot()).toMatchObject({ wheel: { ballLocalSlotIndex: null }, dispatcher: { ball: { id: "second" } }, lastBurnEvent: { ballId: "first" } });
  });
});
