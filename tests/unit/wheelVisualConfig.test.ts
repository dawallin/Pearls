import { describe, expect, it } from "vitest";

import { slotIndexToLocalAngle } from "../../src/runtime/render/wheel/wheelVisualConfig";

describe("wheelVisualConfig", () => {
  it("maps slot zero to the top of the wheel", () => {
    expect(slotIndexToLocalAngle(0, 8)).toBeCloseTo(-Math.PI / 2);
  });

  it("spaces wheel slots evenly clockwise", () => {
    expect(slotIndexToLocalAngle(1, 8) - slotIndexToLocalAngle(0, 8)).toBeCloseTo(
      Math.PI / 4
    );
  });
});
