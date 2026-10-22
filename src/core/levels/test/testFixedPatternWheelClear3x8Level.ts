import { createGridLevelDefinition } from "../../level/gridLevel";

const pearlColors = ["blue", "red", "red", "red", "green", "green", "green", "blue"] as const;

function createPearl(sequenceIndex: number, cycle: number) {
  const color = pearlColors[sequenceIndex];
  return {
    id: `ball-${color}-${String(cycle * pearlColors.length + sequenceIndex + 1).padStart(2, "0")}`,
    color
  };
}

export const testFixedPatternWheelClear3x8Level = createGridLevelDefinition({
  id: "test-fixed-pattern-wheel-clear-3x8",
  name: "Test 9: Fixed-Pattern Wheel Clear",
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
        initialBall: createPearl(0, 0),
        refillQueue: Array.from({ length: pearlColors.length * 2 - 1 }, (_, queueIndex) => {
          const sequenceIndex = (queueIndex + 1) % pearlColors.length;
          const cycle = Math.floor((queueIndex + 1) / pearlColors.length);
          return { ...createPearl(sequenceIndex, cycle), refillSpeed: "fast" as const };
        })
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
        clearRule: {
          type: "pattern",
          targetColors: ["blue", "blue", "green", "green", "green", "red", "red", "red"]
        }
      }
    }
  ]
});
