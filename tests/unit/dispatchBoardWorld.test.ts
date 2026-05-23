import { describe, expect, it } from "vitest";

import {
  advanceDispatchBoardTime,
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
        tick: 1,
        timeMs: 0
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
        tick: 3,
        timeMs: 0
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

  it("dispatches from multiple dispatchers into different connected wheel slots", () => {
    const world = createDispatchBoardWorld({
      dispatchers: [
        {
          id: "dispatcher-top",
          slideId: "slide-top",
          hasInitialBall: true,
          connectedWorldSlotIndex: 0
        },
        {
          id: "dispatcher-left",
          slideId: "slide-left",
          hasInitialBall: true,
          connectedWorldSlotIndex: 6
        }
      ],
      wheelId: "wheel-a",
      wheelSlotCount: 8
    });

    dispatchBall(world, "dispatcher-top");
    dispatchBall(world, "dispatcher-left");
    const snapshot = getDispatchBoardSnapshot(world);

    expect(snapshot.dispatchers).toMatchObject([
      {
        id: "dispatcher-top",
        hasBall: false
      },
      {
        id: "dispatcher-left",
        hasBall: false
      }
    ]);
    expect(snapshot.wheel.slots[0]).toEqual({
      id: "dispatcher-top:ball",
      color: "red"
    });
    expect(snapshot.wheel.slots[6]).toEqual({
      id: "dispatcher-left:ball",
      color: "red"
    });
  });

  it("refills the dispatcher with queued colored balls using deterministic core time", () => {
    const world = createDispatchBoardWorld({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      initialBall: {
        id: "ball-red",
        color: "red"
      },
      refillQueue: [
        {
          id: "ball-green",
          color: "green",
          delayMs: 2000
        },
        {
          id: "ball-blue",
          color: "blue",
          delayMs: 2000
        }
      ]
    });

    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({
      id: "ball-red",
      color: "red"
    });

    dispatchBall(world);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toBeNull();

    advanceDispatchBoardTime(world, 1999);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toBeNull();

    expect(advanceDispatchBoardTime(world, 1)).toEqual([
      {
        type: "DISPATCHER_REFILLED",
        dispatcherId: "dispatcher-a",
        ballId: "ball-green",
        color: "green",
        tick: 2,
        timeMs: 2000
      }
    ]);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({
      id: "ball-green",
      color: "green"
    });

    rotateWheelClockwise(world);
    dispatchBall(world);
    advanceDispatchBoardTime(world, 2000);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toEqual({
      id: "ball-blue",
      color: "blue"
    });

    rotateWheelClockwise(world);
    dispatchBall(world);
    advanceDispatchBoardTime(world, 4000);
    expect(getDispatchBoardSnapshot(world).dispatcher.ball).toBeNull();
  });

  it("preserves ball identity and color in wheel slots as the wheel rotates", () => {
    const world = createDispatchBoardWorld({
      dispatcherId: "dispatcher-a",
      slideId: "slide-a",
      wheelId: "wheel-a",
      wheelSlotCount: 8,
      initialBall: {
        id: "ball-green",
        color: "green"
      }
    });

    dispatchBall(world);
    rotateWheelClockwise(world);
    const snapshot = getDispatchBoardSnapshot(world);

    expect(snapshot.wheel.ballLocalSlotIndex).toBe(0);
    expect(snapshot.wheel.slots[0]).toEqual({
      id: "ball-green",
      color: "green"
    });
  });
});
