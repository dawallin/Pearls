import { describe, expect, it } from "vitest";

import { DispatchBoardController } from "../../src/runtime/game/DispatchBoardController";

describe("DispatchBoardController", () => {
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
    const controller = new DispatchBoardController({ dispatcherId: "dispatcher-a", slideId: "slide-a", wheelId: "wheel-a", wheelSlotCount: 8, transitTravelMs: 100, initialBall: { id: "first", color: "red" }, refillQueue: [{ id: "second", color: "blue", delayMs: 1 }] });
    controller.requestDispatch(); controller.advanceTime(32);
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

  it("queues wheel pearl ejection independently of the downstream dispatcher state", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      transitTravelMs: 32,
      initialBall: { id: "first", color: "red" },
      refillQueue: [{ id: "second", color: "blue", delayMs: 1 }]
    });
    controller.requestDispatch();
    controller.advanceTime(32);

    expect(controller.requestWheelEjection(0)).toEqual({ wheelId: "wheel-a", ball: { id: "first", color: "red" } });
    expect(controller.getSnapshot()).toMatchObject({ wheel: { ballLocalSlotIndex: 0 }, dispatcher: { ball: { id: "second" } } });
    controller.advanceTime(64);
    expect(controller.getSnapshot()).toMatchObject({ wheel: { ballLocalSlotIndex: null }, dispatcher: { ball: { id: "second" } }, lastBurnEvent: { ballId: "first" } });
  });
});
