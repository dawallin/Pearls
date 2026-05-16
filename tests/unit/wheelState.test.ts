import { describe, expect, it } from "vitest";

import {
  createWheelState,
  findWheelOccupantLocalSlotIndex,
  getWheelWorldSlotOccupant,
  rotateWheelState,
  setWheelWorldSlotOccupant
} from "../../src/core/wheel/wheelState";

describe("wheelState", () => {
  it("maps a world slot to the correct local slot after rotation", () => {
    const wheel = createWheelState({
      id: "wheel-a",
      slotCount: 8,
      initialRotationStep: 1
    });

    const localSlotIndex = setWheelWorldSlotOccupant(wheel, 0, "ball-a");

    expect(localSlotIndex).toBe(7);
    expect(findWheelOccupantLocalSlotIndex(wheel, "ball-a")).toBe(7);
  });

  it("keeps an occupant in the same local slot when the wheel rotates", () => {
    const wheel = createWheelState({
      id: "wheel-a",
      slotCount: 8
    });

    setWheelWorldSlotOccupant(wheel, 0, "ball-a");
    rotateWheelState(wheel, 1);

    expect(findWheelOccupantLocalSlotIndex(wheel, "ball-a")).toBe(0);
    expect(getWheelWorldSlotOccupant(wheel, 0)).toBeNull();
    expect(getWheelWorldSlotOccupant(wheel, 1)).toBe("ball-a");
  });
});
