import { describe, expect, it } from "vitest";

import {
  deriveAutomaticWheelConnectorSlides,
  deriveDispatcherConnectorCell,
  deriveWheelConnectorCell
} from "../../src/runtime/render/slide/slidePath";

describe("slidePath", () => {
  it("derives the top-middle connector cell for a 3x3 wheel span", () => {
    expect(
      deriveWheelConnectorCell({
        column: 0,
        row: 5,
        width: 3,
        height: 3,
        component: {
          type: "wheel",
          id: "wheel-a",
          slotCount: 8
        }
      })
    ).toEqual({
      column: 1,
      row: 5
    });
  });

  it("derives the lower-middle connector cell for a 3x3 dispatcher span", () => {
    expect(
      deriveDispatcherConnectorCell({
        column: 0,
        row: 0,
        width: 3,
        height: 3,
        component: {
          type: "dispatcherDown",
          id: "dispatcher-a",
          hasInitialBall: true
        }
      })
    ).toEqual({
      column: 1,
      row: 2
    });
  });

  it("derives connector slide backgrounds from adjacent slide cells", () => {
    const level = {
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
            type: "wheel" as const,
            id: "wheel-top",
            slotCount: 8
          }
        },
        {
          column: 1,
          row: 3,
          component: {
            type: "verticalSlide" as const,
            id: "slide-a"
          }
        },
        {
          column: 1,
          row: 4,
          component: {
            type: "verticalSlide" as const,
            id: "slide-b"
          }
        },
        {
          column: 0,
          row: 5,
          width: 3,
          height: 3,
          component: {
            type: "wheel" as const,
            id: "wheel-bottom",
            slotCount: 8
          }
        }
      ]
    };

    expect(deriveAutomaticWheelConnectorSlides(level, level.cells[0])).toEqual([
      {
        cell: {
          column: 1,
          row: 2
        },
        direction: "vertical"
      }
    ]);
    expect(deriveAutomaticWheelConnectorSlides(level, level.cells[3])).toEqual([
      {
        cell: {
          column: 1,
          row: 5
        },
        direction: "vertical"
      }
    ]);
  });

  it("derives horizontal connector slide backgrounds from adjacent slide cells", () => {
    const level = {
      id: "level-test",
      name: "Test",
      columns: 8,
      rows: 8,
      cells: [
        {
          column: 3,
          row: 6,
          component: {
            type: "horizontalSlide" as const,
            id: "slide-left-a"
          }
        },
        {
          column: 4,
          row: 6,
          component: {
            type: "horizontalSlide" as const,
            id: "slide-left-b"
          }
        },
        {
          column: 5,
          row: 5,
          width: 3,
          height: 3,
          component: {
            type: "wheel" as const,
            id: "wheel-a",
            slotCount: 8
          }
        }
      ]
    };

    expect(deriveAutomaticWheelConnectorSlides(level, level.cells[2])).toEqual([
      {
        cell: {
          column: 5,
          row: 6
        },
        direction: "horizontal"
      }
    ]);
  });
});
