import { describe, expect, it } from "vitest";

import { createGridLevelDefinition } from "../../src/core/level/gridLevel";

describe("gridLevel", () => {
  it("creates a valid level with in-bounds component placement", () => {
    const level = createGridLevelDefinition({
      id: "level-test",
      name: "Test",
      columns: 1,
      rows: 3,
      cells: [
        {
          column: 0,
          row: 0,
          component: {
            type: "dispatcherDown",
            id: "dispatcher-a",
            hasInitialBall: true
          }
        },
        {
          column: 0,
          row: 1,
          component: {
            type: "verticalSlide",
            id: "slide-a"
          }
        },
        {
          column: 0,
          row: 2,
          component: {
            type: "wheel",
            id: "wheel-a",
            slotCount: 8
          }
        }
      ]
    });

    expect(level.columns).toBe(1);
    expect(level.rows).toBe(3);
    expect(level.cells).toHaveLength(3);
  });

  it("rejects duplicate component placement in the same cell", () => {
    expect(() =>
      createGridLevelDefinition({
        id: "level-test",
        name: "Test",
        columns: 2,
        rows: 2,
        cells: [
          {
            column: 0,
            row: 0,
            component: {
              type: "wheel",
              id: "wheel-a",
              slotCount: 8
            }
          },
          {
            column: 0,
            row: 0,
            component: {
              type: "wheel",
              id: "wheel-b",
              slotCount: 8
            }
          }
        ]
      })
    ).toThrow("Duplicate component placement");
  });
});
