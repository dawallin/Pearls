import { describe, expect, it } from "vitest";

import { DispatchBoardController } from "../../src/runtime/game/DispatchBoardController";

describe("DispatchBoardController", () => {
  it("moves authoritative ball state into the wheel before dispatch animation completes", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    const instruction = controller.requestDispatch();
    const snapshot = controller.getSnapshot();

    expect(instruction).toEqual({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a"
    });
    expect(snapshot.dispatcher.hasBall).toBe(false);
    expect(snapshot.wheel.hasBall).toBe(true);
    expect(snapshot.transitInProgress).toBe(true);
    expect(snapshot.lastEvents.map((event) => event.type)).toEqual([
      "BALL_DISPATCHED",
      "BALL_LANDED_IN_WHEEL"
    ]);
  });

  it("blocks wheel rotation until dispatch animation completes, then rotates deterministically", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    controller.requestDispatch();
    expect(controller.requestRotateWheel()).toBeNull();

    controller.completeDispatchAnimation();
    const turnInstruction = controller.requestRotateWheel();

    expect(turnInstruction).toEqual({
      wheelId: "wheel-a",
      targetAngle: 45,
      targetRotation: Math.PI / 4,
      rotationStep: 1
    });
    expect(controller.getSnapshot().wheel.isAnimating).toBe(true);
  });

  it("keeps visual rotation cumulative across a full wheel cycle", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    controller.requestDispatch();
    controller.completeDispatchAnimation();

    for (let turn = 1; turn <= 8; turn += 1) {
      const instruction = controller.requestRotateWheel();

      expect(instruction).not.toBeNull();
      expect(instruction?.targetAngle).toBe(turn * 45);
      expect(instruction?.rotationStep).toBe(turn % 8);
      controller.completeWheelAnimation();
    }

    const nextTurn = controller.requestRotateWheel();

    expect(nextTurn).toMatchObject({
      targetAngle: 405,
      rotationStep: 1
    });
  });

  it("allows rotating the empty wheel before dispatch and still dispatches afterward", () => {
    const controller = new DispatchBoardController({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    const turnInstruction = controller.requestRotateWheel();

    expect(turnInstruction).toMatchObject({
      rotationStep: 1
    });

    controller.completeWheelAnimation();
    const dispatchInstruction = controller.requestDispatch();
    const snapshot = controller.getSnapshot();

    expect(dispatchInstruction).toEqual({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a"
    });
    expect(snapshot.wheel.rotationStep).toBe(1);
    expect(snapshot.wheel.ballLocalSlotIndex).toBe(7);
    expect(snapshot.wheel.hasBall).toBe(true);
  });
});
