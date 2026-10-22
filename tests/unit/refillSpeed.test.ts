import { describe, expect, it } from "vitest";

import { getRefillDelayMs, REFILL_DELAY_MS_BY_SPEED } from "../../src/core/board/refillSpeed";

describe("dispatcher refill speeds", () => {
  it("maps the named pacing choices to stable deterministic core durations", () => {
    expect(getRefillDelayMs("fast")).toBe(250);
    expect(getRefillDelayMs("slow")).toBe(2000);
    expect(REFILL_DELAY_MS_BY_SPEED).toEqual({ fast: 250, slow: 2000 });
  });
});
