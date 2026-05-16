import { describe, expect, it } from "vitest";

import {
  createWheelWorld,
  enqueueRotateWheel,
  getWheelWorldSnapshot,
  tickWheelWorld
} from "../../src/core/wheel/wheelWorld";

describe("wheelWorld", () => {
  it("rotates a wheel deterministically on tick", () => {
    const world = createWheelWorld([{ id: "wheel-a", slotCount: 8 }]);

    enqueueRotateWheel(world, "wheel-a");
    const events = tickWheelWorld(world);
    const snapshot = getWheelWorldSnapshot(world);

    expect(events).toEqual([
      {
        type: "WHEEL_ROTATED",
        wheelId: "wheel-a",
        steps: 1,
        rotationStep: 1,
        tick: 1
      }
    ]);
    expect(snapshot.wheels["wheel-a"].rotationStep).toBe(1);
    expect(snapshot.pendingCommands).toBe(0);
  });

  it("preserves queue order and wraps rotation by slot count", () => {
    const world = createWheelWorld([{ id: "wheel-a", slotCount: 8 }]);

    enqueueRotateWheel(world, "wheel-a", 7);
    enqueueRotateWheel(world, "wheel-a", 3);

    const events = tickWheelWorld(world);
    const snapshot = getWheelWorldSnapshot(world);

    expect(events.map((event) => event.rotationStep)).toEqual([7, 2]);
    expect(snapshot.wheels["wheel-a"].rotationStep).toBe(2);
    expect(snapshot.tick).toBe(1);
  });
});
