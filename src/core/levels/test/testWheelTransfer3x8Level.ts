import { createGridLevelDefinition } from "../../level/gridLevel";

export const testWheelTransfer3x8Level = createGridLevelDefinition({
  id: "test-wheel-transfer-3x8",
  name: "Test Wheel Transfer 3x8",
  columns: 3,
  rows: 8,
  cells: [
    {
      column: 0,
      row: 0,
      width: 3,
      height: 3,
      component: {
        type: "wheel",
        id: "wheel-top",
        slotCount: 8
      }
    },
    {
      column: 1,
      row: 3,
      component: {
        type: "verticalSlide",
        id: "slide-transfer-a"
      }
    },
    {
      column: 1,
      row: 4,
      component: {
        type: "verticalSlide",
        id: "slide-transfer-b"
      }
    },
    {
      column: 0,
      row: 5,
      width: 3,
      height: 3,
      component: {
        type: "wheel",
        id: "wheel-bottom",
        slotCount: 8
      }
    }
  ]
});
