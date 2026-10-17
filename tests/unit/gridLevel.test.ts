import { describe, expect, it } from "vitest";

import { createGridLevelDefinition } from "../../src/core/level/gridLevel";

describe("gridLevel", () => {
  it("creates a valid level with in-bounds component placement", () => {
    const level = createGridLevelDefinition({
      id: "level-test",
      name: "Test",
      columns: 3,
      rows: 8,
      cells: [
        {
          column: 0,
          row: 0,
          width: 3,
          height: 3,
          component: {
            type: "dispatcherDown",
            id: "dispatcher-a",
            hasInitialBall: true
          }
        },
        {
          column: 1,
          row: 3,
          component: {
            type: "verticalSlide",
            id: "slide-a"
          }
        },
        {
          column: 0,
          row: 5,
          width: 3,
          height: 3,
          component: {
            type: "wheel",
            id: "wheel-a",
            slotCount: 8
          }
        }
      ]
    });

    expect(level.columns).toBe(3);
    expect(level.rows).toBe(8);
    expect(level.cells).toHaveLength(3);
  });

  it("creates a valid level with a multi-cell component span", () => {
    const level = createGridLevelDefinition({
      id: "level-test",
      name: "Test",
      columns: 3,
      rows: 3,
      cells: [
        {
          column: 0,
          row: 0,
          width: 3,
          height: 3,
          component: {
            type: "wheel",
            id: "wheel-a",
            slotCount: 8
          }
        }
      ]
    });

    expect(level.cells[0].width).toBe(3);
    expect(level.cells[0].height).toBe(3);
  });

  it("accepts a harmony clear rule only on a wheel", () => {
    const level = createGridLevelDefinition({
      id: "harmony-level",
      name: "Harmony",
      columns: 3,
      rows: 3,
      cells: [
        {
          column: 0,
          row: 0,
          width: 3,
          height: 3,
          component: {
            type: "wheel",
            id: "wheel-a",
            slotCount: 8,
            clearRule: { type: "harmony" }
          }
        }
      ]
    });

    expect(level.cells[0].component).toMatchObject({
      clearRule: { type: "harmony" }
    });
  });

  it("rejects an unsupported wheel clear rule", () => {
    expect(() =>
      createGridLevelDefinition({
        id: "invalid-clear-rule-level",
        name: "Invalid clear rule",
        columns: 3,
        rows: 3,
        cells: [
          {
            column: 0,
            row: 0,
            width: 3,
            height: 3,
            component: {
              type: "wheel",
              id: "wheel-a",
              slotCount: 8,
              clearRule: { type: "pattern" } as never
            }
          }
        ]
      })
    ).toThrow('Wheel "wheel-a" has an unsupported clear rule.');
  });

  it("creates a valid level with a right-facing dispatcher component", () => {
    const level = createGridLevelDefinition({
      id: "level-test",
      name: "Test",
      columns: 8,
      rows: 8,
      cells: [
        {
          column: 0,
          row: 5,
          width: 3,
          height: 3,
          component: {
            type: "dispatcherRight",
            id: "dispatcher-right-a",
            hasInitialBall: true
          }
        },
        {
          column: 3,
          row: 5,
          width: 3,
          height: 3,
          component: {
            type: "wheel",
            id: "wheel-a",
            slotCount: 8
          }
        }
      ]
    });

    expect(level.cells[0].component.type).toBe("dispatcherRight");
  });

  it("creates a valid level with a horizontal slide component", () => {
    const level = createGridLevelDefinition({
      id: "level-test",
      name: "Test",
      columns: 2,
      rows: 1,
      cells: [
        {
          column: 0,
          row: 0,
          component: {
            type: "horizontalSlide",
            id: "slide-horizontal-a"
          }
        }
      ]
    });

    expect(level.cells[0].component.type).toBe("horizontalSlide");
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

  it("rejects component spans that overlap covered cells", () => {
    expect(() =>
      createGridLevelDefinition({
        id: "level-test",
        name: "Test",
        columns: 3,
        rows: 3,
        cells: [
          {
            column: 0,
            row: 0,
            width: 3,
            height: 3,
            component: {
              type: "wheel",
              id: "wheel-a",
              slotCount: 8
            }
          },
          {
            column: 1,
            row: 1,
            component: {
              type: "verticalSlide",
              id: "slide-a"
            }
          }
        ]
      })
    ).toThrow("Duplicate component placement");
  });

  it("rejects component spans outside the grid bounds", () => {
    expect(() =>
      createGridLevelDefinition({
        id: "level-test",
        name: "Test",
        columns: 3,
        rows: 3,
        cells: [
          {
            column: 1,
            row: 0,
            width: 3,
            height: 1,
            component: {
              type: "verticalSlide",
              id: "slide-a"
            }
          }
        ]
      })
    ).toThrow("extends outside level columns");
  });
});
