import { describe, expect, it } from "vitest";

import { WheelTransferController } from "../../src/runtime/game/WheelTransferController";

describe("WheelTransferController", () => {
  it("moves authoritative ball state before transfer animation completes", () => {
    const controller = new WheelTransferController({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    const instruction = controller.requestTransfer("wheel-top");
    const snapshot = controller.getSnapshot();

    expect(instruction).toEqual({
      type: "transfer",
      ballId: "transfer-ball",
      fromWheelId: "wheel-top",
      toWheelId: "wheel-bottom",
      sourceLocalSlotIndex: 4,
      targetLocalSlotIndex: 0
    });
    expect(snapshot.wheels["wheel-top"].hasBall).toBe(false);
    expect(snapshot.wheels["wheel-bottom"].hasBall).toBe(true);
    expect(snapshot.transitInProgress).toBe(true);
  });

  it("blocks rotation and further transfer while transfer animation is in progress", () => {
    const controller = new WheelTransferController({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    controller.requestTransfer("wheel-top");

    expect(controller.requestRotateWheel("wheel-bottom")).toBeNull();
    expect(controller.requestTransfer("wheel-bottom")).toBeNull();

    controller.completeTransferAnimation();

    expect(controller.requestRotateWheel("wheel-bottom")).toMatchObject({
      wheelId: "wheel-bottom",
      rotationStep: 1
    });
  });

  it("does not transfer when the source ball is no longer slide-aligned", () => {
    const controller = new WheelTransferController({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8
    });

    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({
      wheelId: "wheel-top",
      rotationStep: 1
    });
    controller.completeWheelAnimation("wheel-top");

    expect(controller.requestTransfer("wheel-top")).toBeNull();
    expect(controller.getSnapshot().wheels["wheel-top"].hasBall).toBe(true);
  });

  it("returns a bounce instruction and gates input until bounce animation completes", () => {
    const controller = new WheelTransferController({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      initialBallWheelIds: ["wheel-top", "wheel-bottom"]
    });

    expect(controller.requestTransfer("wheel-top")).toEqual({
      type: "bounce",
      ballId: "transfer-ball",
      fromWheelId: "wheel-top",
      toWheelId: "wheel-bottom",
      sourceLocalSlotIndex: 4,
      targetLocalSlotIndex: 0
    });
    expect(controller.requestRotateWheel("wheel-top")).toBeNull();
    expect(controller.requestTransfer("wheel-top")).toBeNull();

    controller.completeTransferAnimation();
    expect(controller.requestRotateWheel("wheel-top")).toMatchObject({
      wheelId: "wheel-top",
      rotationStep: 1
    });
  });

  it("returns an upward bounce instruction when the lower ball is clicked", () => {
    const controller = new WheelTransferController({
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      initialBallWheelIds: ["wheel-top", "wheel-bottom"]
    });

    expect(controller.requestTransfer("wheel-bottom")).toEqual({
      type: "bounce",
      ballId: "blocking-ball",
      fromWheelId: "wheel-bottom",
      toWheelId: "wheel-top",
      sourceLocalSlotIndex: 0,
      targetLocalSlotIndex: 4
    });
  });
});
