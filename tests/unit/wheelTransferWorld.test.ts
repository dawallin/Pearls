import { describe, expect, it } from "vitest";

import {
  advanceWheelTransferWorld,
  createWheelTransferWorld,
  getWheelTransferSnapshot,
  rotateTransferWheelClockwise,
  PEARL_TRANSIT_SPEED_GRID_UNITS_PER_MS,
  transferBallFromWheel,
  WHEEL_TRANSFER_FIXED_TICK_MS,
  WHEEL_TRANSFER_REFERENCE_ROUTE_LENGTH_GRID_UNITS,
  WHEEL_TRANSFER_TRAVEL_MS,
  setWheelTransferConnection
} from "../../src/core/board/wheelTransferWorld";
import { testWheelTransfer3x8Level } from "../../src/core/levels/test/testWheelTransfer3x8Level";
import { testWheelBounce3x8Level } from "../../src/core/levels/test/testWheelBounce3x8Level";
import {
  PEARL_DIAMETER_GRID_UNITS,
  REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS,
  WHEEL_COMPONENT_RENDER_FIT_FACTOR
} from "../../src/core/geometry/physicalGeometry";

const transferConfig = {
  level: testWheelTransfer3x8Level,
  topWheelId: "wheel-top",
  bottomWheelId: "wheel-bottom",
  wheelSlotCount: 8,
  topConnectedWorldSlotIndex: 4,
  bottomConnectedWorldSlotIndex: 0
};

describe("wheelTransferWorld", () => {
  it("uses the shared fixed-time travel duration", () => {
    const world = createWheelTransferWorld(transferConfig);
    const ticksBeforeArrival = Math.floor(WHEEL_TRANSFER_TRAVEL_MS / WHEEL_TRANSFER_FIXED_TICK_MS);

    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, ticksBeforeArrival);
    expect(getWheelTransferSnapshot(world).activeTransits).toHaveLength(1);

    advanceWheelTransferWorld(world, 1);
    expect(getWheelTransferSnapshot(world).wheels["wheel-bottom"].slotBallIds[0]).toBe("transfer-ball");
  });

  it("derives transit speed from the named two-slide reference route", () => {
    expect(WHEEL_TRANSFER_REFERENCE_ROUTE_LENGTH_GRID_UNITS).toBeCloseTo(
      REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS,
      8
    );
    expect(PEARL_TRANSIT_SPEED_GRID_UNITS_PER_MS).toBeCloseTo(
      WHEEL_TRANSFER_REFERENCE_ROUTE_LENGTH_GRID_UNITS / WHEEL_TRANSFER_TRAVEL_MS,
      12
    );
  });

  it("requires test-level connected world slots instead of applying generic defaults", () => {
    expect(() => createWheelTransferWorld({
      level: testWheelTransfer3x8Level,
      topWheelId: "wheel-top",
      bottomWheelId: "wheel-bottom",
      wheelSlotCount: 8,
      topConnectedWorldSlotIndex: undefined as never,
      bottomConnectedWorldSlotIndex: undefined as never
    })).toThrow("connected world slot");
  });

  it("launches, lands, and returns a ball through deterministic fixed ticks", () => {
    const world = createWheelTransferWorld(transferConfig);
    expect(transferBallFromWheel(world, "wheel-top")).toMatchObject({ ballId: "transfer-ball" });
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].ballLocalSlotIndex).toBe(4);
    expect(advanceWheelTransferWorld(world, 1)).toContainEqual(expect.objectContaining({ type: "BALL_LAUNCHED", ballId: "transfer-ball" }));
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].ballLocalSlotIndex).toBeNull();
    advanceWheelTransferWorld(world, 39);
    expect(getWheelTransferSnapshot(world).wheels["wheel-bottom"].slotBallIds[0]).toBe("transfer-ball");
    transferBallFromWheel(world, "wheel-bottom");
    advanceWheelTransferWorld(world, 40);
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
  });

  it("does nothing when the ball is not aligned with the connected slide slot", () => {
    const world = createWheelTransferWorld(transferConfig);
    rotateTransferWheelClockwise(world, "wheel-top");
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].rotationStep).toBe(0);
    advanceWheelTransferWorld(world);
    expect(transferBallFromWheel(world, "wheel-top")).toBeNull();
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].ballLocalSlotIndex).toBe(4);
  });

  it("rotates only the requested wheel", () => {
    const world = createWheelTransferWorld(transferConfig);
    rotateTransferWheelClockwise(world, "wheel-bottom");
    expect(getWheelTransferSnapshot(world).wheels["wheel-bottom"].rotationStep).toBe(0);
    advanceWheelTransferWorld(world);
    const snapshot = getWheelTransferSnapshot(world);
    expect(snapshot.wheels["wheel-top"].rotationStep).toBe(0);
    expect(snapshot.wheels["wheel-bottom"].rotationStep).toBe(1);
  });

  it("keeps an active component and local progress unchanged until a queued wheel rotation reaches a tick", () => {
    const world = createWheelTransferWorld(transferConfig);
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 5);
    const before = getWheelTransferSnapshot(world).activeTransits[0];

    expect(rotateTransferWheelClockwise(world, "wheel-bottom")).toMatchObject({ wheelId: "wheel-bottom", rotationStep: 1 });

    const after = getWheelTransferSnapshot(world).activeTransits[0];
    expect(after).toMatchObject({
      ball: before.ball,
      segment: before.segment,
      currentSegmentId: before.currentSegmentId,
      currentComponentId: before.currentComponentId,
      localProgress: before.localProgress,
      direction: before.direction
    });
  });

  it("lands in the rotated destination world slot at deterministic arrival", () => {
    const world = createWheelTransferWorld(transferConfig);
    transferBallFromWheel(world, "wheel-top");
    rotateTransferWheelClockwise(world, "wheel-bottom");
    advanceWheelTransferWorld(world, 40);

    const snapshot = getWheelTransferSnapshot(world);
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[7]).toBe("transfer-ball");
    expect(snapshot.lastEvents).toContainEqual(expect.objectContaining({
      type: "BALL_LANDED",
      localSlotIndex: 7
    }));
  });

  it("bounces from an occupied destination world slot after that wheel has rotated", () => {
    const world = createWheelTransferWorld({
      ...transferConfig,
      level: testWheelBounce3x8Level,
      initialBottomRotationStep: 1,
      initialBallWheelIds: ["wheel-top", "wheel-bottom"]
    });
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 70);

    const snapshot = getWheelTransferSnapshot(world);
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[7]).toBe("blocking-ball");
    expect(snapshot.lastEvents).toContainEqual(expect.objectContaining({
      type: "BALL_BOUNCED",
      targetLocalSlotIndex: 7
    }));
  });

  it("bounces at an occupied endpoint and returns to the empty source slot", () => {
    const world = createWheelTransferWorld({ ...transferConfig, level: testWheelBounce3x8Level, initialBallWheelIds: ["wheel-top", "wheel-bottom"] });
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 70);
    const snapshot = getWheelTransferSnapshot(world);
    expect(snapshot.lastEvents).toContainEqual(expect.objectContaining({ type: "BALL_BOUNCED", ballId: "transfer-ball" }));
    expect(snapshot.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
    expect(snapshot.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");
  });

  it("collides opposing pearls on Test 6 and returns both identities to their source wheels", () => {
    const run = (reverse: boolean) => {
      const world = createWheelTransferWorld({ ...transferConfig, level: testWheelBounce3x8Level, initialBallWheelIds: ["wheel-top", "wheel-bottom"] });
      transferBallFromWheel(world, "wheel-top");
      transferBallFromWheel(world, "wheel-bottom");
      advanceWheelTransferWorld(world);
      if (reverse) world.activeTransits = new Map([...world.activeTransits].reverse());
      advanceWheelTransferWorld(world, 80);
      const snapshot = getWheelTransferSnapshot(world);
      expect(snapshot.lastEvents.filter((event) => event.type === "BALL_COLLIDED")).toHaveLength(1);
      expect(snapshot.activeTransits).toEqual([]);
      expect(snapshot.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
      expect(snapshot.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");
      return snapshot;
    };
    expect(run(false)).toEqual(run(true));
  });

  it("bounces from a completely full destination wheel without consuming or replacing any pearl", () => {
    const world = createWheelTransferWorld({ ...transferConfig, level: testWheelBounce3x8Level, initialBallWheelIds: ["wheel-top", "wheel-bottom"] });
    const wheel = world.wheels["wheel-bottom"];
    for (let index = 1; index < wheel.slotCount; index += 1) {
      const id = `filler-${index}`;
      world.balls[id] = { id, color: "blue" };
      wheel.slots[index] = id;
    }
    const before = [...wheel.slots];
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 80);
    expect(world.lastEvents).toContainEqual(expect.objectContaining({ type: "BALL_BOUNCED", ballId: "transfer-ball" }));
    expect(wheel.slots).toEqual(before);
    expect(getWheelTransferSnapshot(world).wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
  });

  it("catalogs two slide components and emits a stable graph handoff", () => {
    const world = createWheelTransferWorld(transferConfig);
    expect(getWheelTransferSnapshot(world).components.map((component) => component.componentId)).toEqual(["slide-transfer-a", "slide-transfer-b"]);
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 20);
    const snapshot = getWheelTransferSnapshot(world);
    expect(snapshot.activeTransits[0]).toMatchObject({ currentSegmentId: "segment:slide-transfer-b", currentComponentId: "slide-transfer-b", direction: "forward" });
    expect(snapshot.lastEvents).toContainEqual(expect.objectContaining({ type: "SEGMENT_HANDOFF", fromSegmentId: "segment:slide-transfer-a", toSegmentId: "segment:slide-transfer-b" }));
  });

  it("rejects dynamic endpoints that are undeclared or physically incompatible", () => {
    const world = createWheelTransferWorld(transferConfig);
    expect(() => setWheelTransferConnection(world, "slide-transfer-a", "south", { kind: "wheel", wheelId: "wheel-top", entryEdge: "south" })).toThrow("not a valid connection option");
    expect(() => createWheelTransferWorld({
      ...transferConfig,
      connectionOptions: [{ componentId: "slide-transfer-a", exitEdge: "south", endpoint: { kind: "component", componentId: "slide-transfer-b", entryEdge: "south" } }]
    })).toThrow("physically compatible");
  });

  it("preserves the actual launch origin in dynamically resolved landing events", () => {
    const world = createWheelTransferWorld(transferConfig);
    transferBallFromWheel(world, "wheel-top");
    advanceWheelTransferWorld(world, 40);
    expect(getWheelTransferSnapshot(world).lastEvents).toContainEqual(expect.objectContaining({ type: "BALL_TRANSFERRED", fromWheelId: "wheel-top", toWheelId: "wheel-bottom" }));
  });

  it("bounces before the occupied endpoint center", () => {
    const world = createWheelTransferWorld({ ...transferConfig, level: testWheelBounce3x8Level, initialBallWheelIds: ["wheel-top", "wheel-bottom"] });
    transferBallFromWheel(world, "wheel-top");
    for (let tick = 0; tick < 40; tick += 1) {
      advanceWheelTransferWorld(world);
      const snapshot = getWheelTransferSnapshot(world);
      const bounce = snapshot.lastEvents.find((event) => event.type === "BALL_BOUNCED");
      if (!bounce || bounce.type !== "BALL_BOUNCED") continue;
      const finalSegment = snapshot.components.at(-1)!;
      expect(bounce.localProgress).toBeCloseTo(finalSegment.length - PEARL_DIAMETER_GRID_UNITS, 8);
      expect(snapshot.activeTransits[0].localProgress).toBeLessThan(finalSegment.length);
      expect(snapshot.activeTransits[0].localProgress).toBeLessThan(bounce.localProgress);
      return;
    }
    throw new Error("Expected an occupied-endpoint bounce.");
  });

  it("uses the same fitted wheel diameter for core pearl contact geometry as runtime rendering", () => {
    expect(WHEEL_COMPONENT_RENDER_FIT_FACTOR).toBe(0.94);
    expect(PEARL_DIAMETER_GRID_UNITS).toBeCloseTo((65.6 / 306) * 3 * 0.94 * 1_000, 8);
  });
});
