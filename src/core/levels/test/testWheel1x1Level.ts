import { createGridLevelDefinition } from "../../level/gridLevel";

export const testWheel1x1Level = createGridLevelDefinition({
  id: "test-wheel-1x1",
  name: "Test Wheel 1x1",
  columns: 1,
  rows: 1,
  cells: [
    {
      column: 0,
      row: 0,
      component: {
        type: "wheel",
        id: "wheel-01",
        slotCount: 8
      }
    }
  ]
});
