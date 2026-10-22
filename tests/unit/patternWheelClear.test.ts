import { describe, expect, it } from "vitest";

import { evaluateWheelClearRule } from "../../src/core/wheel/wheelClearRule";
import { createGridLevelDefinition } from "../../src/core/level/gridLevel";

const targets = ["blue", "blue", "green", "green", "green", "red", "red", "red"] as const;
const balls = {
  blueA: { id: "blueA", color: "blue" },
  blueB: { id: "blueB", color: "blue" },
  greenA: { id: "greenA", color: "green" },
  greenB: { id: "greenB", color: "green" },
  greenC: { id: "greenC", color: "green" },
  redA: { id: "redA", color: "red" },
  redB: { id: "redB", color: "red" },
  redC: { id: "redC", color: "red" }
} as const;

describe("fixed-pattern wheel clear rule", () => {
  const rule = { type: "pattern", targetColors: targets } as const;

  it("does not clear a partial wheel", () => {
    expect(evaluateWheelClearRule(rule, ["blueA", null, null, null, null, null, null, null], balls)).toBeNull();
  });

  it("rejects a full arrangement with matching color totals in the wrong slots", () => {
    expect(evaluateWheelClearRule(rule, ["redA", "blueA", "greenA", "greenB", "greenC", "blueB", "redB", "redC"], balls)).toBeNull();
  });

  it("returns every consumed ID when each local slot matches its target", () => {
    const ids = ["blueA", "blueB", "greenA", "greenB", "greenC", "redA", "redB", "redC"] as const;
    expect(evaluateWheelClearRule(rule, ids, balls)).toEqual({ consumedBallIds: ids });
  });

  it("validates pattern target count and colors when creating a level", () => {
    expect(() => createPatternLevel(["blue", "red"] as const)).toThrow(
      'Wheel "wheel-pattern" pattern target count must match slotCount.'
    );
    expect(() => createPatternLevel(["blue", "blue", "green", "green", "green", "red", "red", "purple"] as never)).toThrow(
      'Wheel "wheel-pattern" pattern contains an unsupported target color.'
    );
  });
});

function createPatternLevel(targetColors: readonly (typeof targets)[number][]) {
  return createGridLevelDefinition({
    id: "pattern-test",
    name: "Pattern test",
    columns: 3,
    rows: 3,
    cells: [{
      column: 0,
      row: 0,
      width: 3,
      height: 3,
      component: { type: "wheel", id: "wheel-pattern", slotCount: 8, clearRule: { type: "pattern", targetColors } }
    }]
  });
}
