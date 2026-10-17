import { describe, expect, it } from "vitest";

import { WheelTransferController } from "../../src/runtime/game/WheelTransferController";
import { testWheelTransfer3x8Level } from "../../src/core/levels/test/testWheelTransfer3x8Level";

const transferConfig = {
  level: testWheelTransfer3x8Level,
  topWheelId: "wheel-top",
  bottomWheelId: "wheel-bottom",
  wheelSlotCount: 8,
  topConnectedWorldSlotIndex: 4,
  bottomConnectedWorldSlotIndex: 0
};

describe("WheelTransferController", () => {
  it("accepts a second valid launch while the first pearl is active", () => {
    const controller = new WheelTransferController({
      level: testWheelTransfer3x8Level,
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      topConnectedWorldSlotIndex: 4,
      bottomConnectedWorldSlotIndex: 0,
      initialBalls: [
        { wheelId: "wheel-top", ball: { id: "pearl-red", color: "red" } },
        { wheelId: "wheel-bottom", ball: { id: "pearl-blue", color: "blue" } }
      ]
    });

    expect(controller.requestTransfer("wheel-top")).toMatchObject({ ballId: "pearl-red" });
    expect(controller.requestTransfer("wheel-bottom")).toMatchObject({ ballId: "pearl-blue" });
    expect(controller.getSnapshot().transitInProgress).toBe(true);
    expect(controller.getSnapshot().activeTransits).toEqual([]);
    controller.advanceTime(1);
    expect(controller.getSnapshot().activeTransits).toHaveLength(2);
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({ wheelId: "wheel-top", rotationStep: 1 });

    controller.advanceTime(79);
    const snapshot = controller.getSnapshot();
    expect(snapshot.transitInProgress).toBe(false);
    expect(snapshot.wheels["wheel-top"].slotBallIds[3]).toBe("pearl-red");
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[0]).toBe("pearl-blue");
  });

  it("keeps an unaligned pearl in its wheel", () => {
    const controller = new WheelTransferController(transferConfig);
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({ wheelId: "wheel-top", rotationStep: 1 });
    expect(controller.getSnapshot().wheels["wheel-top"].rotationStep).toBe(0);
    controller.advanceTime(1);
    expect(controller.requestTransfer("wheel-top")).toBeNull();
  });

  it("rejects only a second visual turn for the same wheel and permits concurrent turns", () => {
    const controller = new WheelTransferController(transferConfig);
    controller.getSnapshot();
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({ wheelId: "wheel-top", rotationStep: 1 });
    expect(controller.getSnapshot().wheels["wheel-top"]).toMatchObject({
      rotationStep: 0,
      targetAngle: 45,
      pendingTurns: 0,
      isAnimating: true
    });
    expect(controller.requestRotateWheel("wheel-top")).toBeNull();
    expect(controller.getSnapshot().wheels["wheel-top"].rotationStep).toBe(0);
    expect(controller.requestRotateWheel("wheel-bottom")).toMatchObject({ wheelId: "wheel-bottom", rotationStep: 1 });
    expect(controller.getSnapshot().wheels["wheel-bottom"].isAnimating).toBe(true);

    expect(controller.completeWheelAnimation("wheel-top")).toBeNull();
    expect(controller.getSnapshot().wheels["wheel-top"].isAnimating).toBe(false);
  });

  it("keeps core rotation mapping stable at 0.25x-equivalent presentation speed", () => {
    const controller = new WheelTransferController(transferConfig);
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({ rotationStep: 1, targetAngle: 45 });
    expect(controller.getSnapshot().wheels["wheel-top"].rotationStep).toBe(0);
    controller.advanceTime(1);
    expect(controller.getSnapshot().wheels["wheel-top"].rotationStep).toBe(1);
    controller.completeWheelAnimation("wheel-top");
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({ rotationStep: 2, targetAngle: 90 });
  });

  it("permits a wheel turn during transit without changing its active route", () => {
    const controller = new WheelTransferController(transferConfig);
    controller.requestTransfer("wheel-top");
    controller.advanceTime(5);
    const before = controller.getSnapshot().activeTransits[0];
    expect(controller.requestRotateWheel("wheel-bottom")).toMatchObject({ wheelId: "wheel-bottom", rotationStep: 1 });
    expect(controller.getSnapshot().activeTransits[0]).toEqual(before);
  });
});
