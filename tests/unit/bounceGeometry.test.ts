import { describe, expect, it } from "vitest";

import { getBounceContactPoint } from "../../src/runtime/scenes/bounceGeometry";

describe("bounceGeometry", () => {
  it("stops the moving ball before it overlaps the blocking ball", () => {
    const contactPoint = getBounceContactPoint(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      12,
      18
    );

    expect(contactPoint).toEqual({ x: 70, y: 0 });
  });

  it("handles diagonal travel using the same center separation", () => {
    const contactPoint = getBounceContactPoint(
      { x: 0, y: 0 },
      { x: 30, y: 40 },
      10,
      10
    );

    expect(contactPoint.x).toBeCloseTo(18);
    expect(contactPoint.y).toBeCloseTo(24);
  });

  it("can allow visual penetration before reversing the bounce", () => {
    const contactPoint = getBounceContactPoint(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      20,
      20,
      0.35
    );

    expect(contactPoint).toEqual({ x: 67, y: 0 });
  });
});
