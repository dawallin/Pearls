import { describe, expect, it } from "vitest";

import {
  createWheelTransferWorld,
  getWheelTransferSnapshot,
  rotateTransferWheelClockwise,
  transferBallFromWheel
} from "../../src/core/board/wheelTransferWorld";

describe("wheelTransferWorld", () => {
  it("transfers the ball from the top wheel to the bottom wheel and back", () => {
    const world = createWheelTransferWorld({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    const downEvents = transferBallFromWheel(world, "wheel-top");
    let snapshot = getWheelTransferSnapshot(world);

    expect(downEvents).toEqual([
      {
        type: "BALL_TRANSFERRED",
        ballId: "transfer-ball",
        fromWheelId: "wheel-top",
        toWheelId: "wheel-bottom",
        sourceLocalSlotIndex: 4,
        targetLocalSlotIndex: 0,
        tick: 1
      }
    ]);
    expect(snapshot.wheels["wheel-top"].ballLocalSlotIndex).toBeNull();
    expect(snapshot.wheels["wheel-bottom"].ballLocalSlotIndex).toBe(0);

    const upEvents = transferBallFromWheel(world, "wheel-bottom");
    snapshot = getWheelTransferSnapshot(world);

    expect(upEvents).toEqual([
      {
        type: "BALL_TRANSFERRED",
        ballId: "transfer-ball",
        fromWheelId: "wheel-bottom",
        toWheelId: "wheel-top",
        sourceLocalSlotIndex: 0,
        targetLocalSlotIndex: 4,
        tick: 2
      }
    ]);
    expect(snapshot.wheels["wheel-top"].ballLocalSlotIndex).toBe(4);
    expect(snapshot.wheels["wheel-bottom"].ballLocalSlotIndex).toBeNull();
  });

  it("does nothing when the ball is not aligned with the connected slide slot", () => {
    const world = createWheelTransferWorld({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    rotateTransferWheelClockwise(world, "wheel-top");
    const events = transferBallFromWheel(world, "wheel-top");
    const snapshot = getWheelTransferSnapshot(world);

    expect(events).toEqual([]);
    expect(snapshot.tick).toBe(1);
    expect(snapshot.wheels["wheel-top"].ballLocalSlotIndex).toBe(4);
    expect(snapshot.wheels["wheel-top"].rotationStep).toBe(1);
    expect(snapshot.wheels["wheel-bottom"].ballLocalSlotIndex).toBeNull();
  });

  it("rotates only the requested wheel", () => {
    const world = createWheelTransferWorld({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    rotateTransferWheelClockwise(world, "wheel-bottom");
    const snapshot = getWheelTransferSnapshot(world);

    expect(snapshot.wheels["wheel-top"].rotationStep).toBe(0);
    expect(snapshot.wheels["wheel-bottom"].rotationStep).toBe(1);
  });

  it("bounces without moving either ball when the target connected slot is occupied", () => {
    const world = createWheelTransferWorld({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      initialBallWheelIds: ["wheel-top", "wheel-bottom"]
    });

    const events = transferBallFromWheel(world, "wheel-top");
    const snapshot = getWheelTransferSnapshot(world);

    expect(events).toEqual([
      {
        type: "BALL_BOUNCED",
        ballId: "transfer-ball",
        fromWheelId: "wheel-top",
        toWheelId: "wheel-bottom",
        sourceLocalSlotIndex: 4,
        targetLocalSlotIndex: 0,
        tick: 1
      }
    ]);
    expect(snapshot.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");
  });

  it("bounces the lower ball upward when the top connected slot is occupied", () => {
    const world = createWheelTransferWorld({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      initialBallWheelIds: ["wheel-top", "wheel-bottom"]
    });

    const events = transferBallFromWheel(world, "wheel-bottom");
    const snapshot = getWheelTransferSnapshot(world);

    expect(events).toEqual([
      {
        type: "BALL_BOUNCED",
        ballId: "blocking-ball",
        fromWheelId: "wheel-bottom",
        toWheelId: "wheel-top",
        sourceLocalSlotIndex: 0,
        targetLocalSlotIndex: 4,
        tick: 1
      }
    ]);
    expect(snapshot.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");
  });
});
