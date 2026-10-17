import { describe, expect, it } from "vitest";

import {
  advanceWheelTransferWorld,
  createWheelTransferWorld,
  getWheelTransferSnapshot,
  transferBallFromWheel
} from "../../src/core/board/wheelTransferWorld";
import { testMultiPearlCollision3x10Level } from "../../src/core/levels/test/testMultiPearlCollision3x10Level";
import { PEARL_DIAMETER_GRID_UNITS } from "../../src/core/geometry/physicalGeometry";

describe("multi-pearl slide collision", () => {
  it("reverses opposing pearls deterministically without exchanging their identities", () => {
    const createWorld = () => {
      const world = createWheelTransferWorld({
  level: testMultiPearlCollision3x10Level,
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

      transferBallFromWheel(world, "wheel-top");
      transferBallFromWheel(world, "wheel-bottom");
      advanceWheelTransferWorld(world, 35);
      return getWheelTransferSnapshot(world);
    };

    const first = createWorld();
    const second = createWorld();

    expect(first).toEqual(second);
    expect(first.lastEvents).toContainEqual(expect.objectContaining({
      type: "BALL_COLLIDED",
      pathId: "route:wheel-top:wheel-bottom",
      ballIds: ["pearl-blue", "pearl-red"],
      tick: expect.any(Number),
      segmentId: expect.any(String),
      contacts: expect.arrayContaining([
        expect.objectContaining({ componentId: expect.any(String), localProgress: expect.any(Number) })
      ])
    }));
    expect(first.activeTransits).toEqual([
      expect.objectContaining({ ball: { id: "pearl-blue", color: "blue" }, direction: "forward" }),
      expect.objectContaining({ ball: { id: "pearl-red", color: "red" }, direction: "back" })
    ]);

    const world = createWheelTransferWorld({
      level: testMultiPearlCollision3x10Level,
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
    transferBallFromWheel(world, "wheel-top");
    transferBallFromWheel(world, "wheel-bottom");
    advanceWheelTransferWorld(world, 80);

    const settled = getWheelTransferSnapshot(world);
    expect(settled.activeTransits).toEqual([]);
    expect(settled.wheels["wheel-top"].slots[4]).toEqual({ id: "pearl-red", color: "red" });
    expect(settled.wheels["wheel-bottom"].slots[0]).toEqual({ id: "pearl-blue", color: "blue" });
  });

  it("does not collide pearls travelling in the same direction", () => {
    const world = createWheelTransferWorld({
      level: testMultiPearlCollision3x10Level,
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      topConnectedWorldSlotIndex: 4,
      bottomConnectedWorldSlotIndex: 0,
      initialBalls: [{ wheelId: "wheel-top", ball: { id: "pearl-red", color: "red" } }]
    });

    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 3);

    expect(getWheelTransferSnapshot(world).lastEvents.some((event) => event.type === "BALL_COLLIDED")).toBe(false);
  });

  it("clamps an opposing pair at exact pearl edge contact", () => {
    const world = createWheelTransferWorld({
      level: testMultiPearlCollision3x10Level, topWheelId: "wheel-top", bottomWheelId: "wheel-bottom", wheelSlotCount: 8,
      topConnectedWorldSlotIndex: 4, bottomConnectedWorldSlotIndex: 0,
      initialBalls: [{ wheelId: "wheel-top", ball: { id: "pearl-red", color: "red" } }, { wheelId: "wheel-bottom", ball: { id: "pearl-blue", color: "blue" } }]
    });
    transferBallFromWheel(world, "wheel-top");
    transferBallFromWheel(world, "wheel-bottom");
    for (let tick = 0; tick < 80; tick += 1) {
      advanceWheelTransferWorld(world);
      const snapshot = getWheelTransferSnapshot(world);
      if (!snapshot.lastEvents.some((event) => event.type === "BALL_COLLIDED")) continue;
      const collision = snapshot.lastEvents.find((event) => event.type === "BALL_COLLIDED");
      if (!collision || collision.type !== "BALL_COLLIDED") throw new Error("Expected collision event.");
      const point = (transit: typeof snapshot.activeTransits[number]) => {
        const fraction = transit.localProgress / transit.segment.length;
        return {
          x: transit.segment.entry.x + (transit.segment.exit.x - transit.segment.entry.x) * fraction,
          y: transit.segment.entry.y + (transit.segment.exit.y - transit.segment.entry.y) * fraction
        };
      };
      const first = point(snapshot.activeTransits[0]);
      const second = point(snapshot.activeTransits[1]);
      expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(PEARL_DIAMETER_GRID_UNITS);
      return;
    }
    throw new Error("Expected an opposing pearl collision.");
  });
});
