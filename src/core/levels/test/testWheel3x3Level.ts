import { createGridLevelDefinition } from "../../level/gridLevel";

export const testWheel3x3Level = createGridLevelDefinition({
  id: "test-wheel-3x3",
  name: "Test Wheel 3x3",
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
        id: "wheel-01",
        slotCount: 8
      }
    }
  ]
});
