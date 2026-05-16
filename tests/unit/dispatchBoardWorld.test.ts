import { describe, expect, it } from "vitest";

import {
  createDispatchBoardWorld,
  dispatchBall,
  getDispatchBoardSnapshot,
  rotateWheelClockwise
} from "../../src/core/board/dispatchBoardWorld";

describe("dispatchBoardWorld", () => {
  it("dispatches the initial ball from the dispatcher into the wheel", () => {
    const world = createDispatchBoardWorld({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    const events = dispatchBall(world);
    const snapshot = getDispatchBoardSnapshot(world);

    expect(events.map((event) => event.type)).toEqual([
      "BALL_DISPATCHED",
      "BALL_LANDED_IN_WHEEL"
    ]);
    expect(snapshot.dispatcher.hasBall).toBe(false);
    expect(snapshot.wheel.ballLocalSlotIndex).toBe(0);
    expect(snapshot.tick).toBe(1);
  });

  it("rotates the wheel clockwise only after the ball has landed", () => {
    const world = createDispatchBoardWorld({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    expect(rotateWheelClockwise(world)).toEqual([
      {
        type: "WHEEL_ROTATED",
        wheelId: "wheel-a",
        steps: 1,
        rotationStep: 1,
        tick: 1
      }
    ]);

    dispatchBall(world);
    const events = rotateWheelClockwise(world);
    const snapshot = getDispatchBoardSnapshot(world);

    expect(events).toEqual([
      {
        type: "WHEEL_ROTATED",
        wheelId: "wheel-a",
        steps: 1,
        rotationStep: 2,
        tick: 3
      }
    ]);
    expect(snapshot.wheel.rotationStep).toBe(2);
    expect(snapshot.wheel.ballLocalSlotIndex).toBe(7);
  });

  it("lands the ball in the currently upward-facing connected hole after pre-rotation", () => {
    const world = createDispatchBoardWorld({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    });

    rotateWheelClockwise(world);
    dispatchBall(world);
    const snapshot = getDispatchBoardSnapshot(world);

    expect(snapshot.wheel.rotationStep).toBe(1);
    expect(snapshot.wheel.ballLocalSlotIndex).toBe(7);
  });
});
