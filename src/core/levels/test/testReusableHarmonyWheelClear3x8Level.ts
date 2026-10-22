import { createGridLevelDefinition } from "../../level/gridLevel";

export const testReusableHarmonyWheelClear3x8Level = createGridLevelDefinition({
  id: "test-reusable-harmony-wheel-clear-3x8",
  name: "Test 8: Reusable Harmony Wheel Clear",
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
        id: "dispatcher-01",
        initialBall: { id: "ball-red-01", color: "red" },
        refillQueue: Array.from({ length: 15 }, (_, index) => ({
          id: `ball-red-${String(index + 2).padStart(2, "0")}`,
          color: "red" as const,
          refillSpeed: "fast"
        }))
      }
    },
    { column: 1, row: 3, component: { type: "verticalSlide", id: "slide-01-a" } },
    { column: 1, row: 4, component: { type: "verticalSlide", id: "slide-01-b" } },
    {
      column: 0,
      row: 5,
      width: 3,
      height: 3,
      component: {
        type: "wheel",
        id: "wheel-01",
        slotCount: 8,
        clearRule: { type: "harmony" }
      }
    }
  ]
});
