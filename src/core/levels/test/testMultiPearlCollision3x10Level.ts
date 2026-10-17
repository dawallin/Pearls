import { createGridLevelDefinition } from "../../level/gridLevel";
import type { WheelTransferConfig } from "../../board/wheelTransferWorld";

export const testMultiPearlCollision3x10Level = createGridLevelDefinition({
  id: "test-multi-pearl-collision-3x10",
  name: "Test Multi-Pearl Slide Collision 3x10",
  columns: 3,
  rows: 10,
  cells: [
    { column: 0, row: 0, width: 3, height: 3, component: { type: "wheel", id: "wheel-top", slotCount: 8 } },
    { column: 1, row: 3, component: { type: "verticalSlide", id: "slide-collision-a" } },
    { column: 1, row: 4, component: { type: "verticalSlide", id: "slide-collision-b" } },
    { column: 1, row: 5, component: { type: "verticalSlide", id: "slide-collision-c" } },
    { column: 1, row: 6, component: { type: "verticalSlide", id: "slide-collision-d" } },
    { column: 0, row: 7, width: 3, height: 3, component: { type: "wheel", id: "wheel-bottom", slotCount: 8 } }
  ]
});

export const testMultiPearlCollision3x10Config: Omit<WheelTransferConfig, "level"> = {
  topWheelId: "wheel-top",
  bottomWheelId: "wheel-bottom",
  wheelSlotCount: 8,
  topConnectedWorldSlotIndex: 4,
  bottomConnectedWorldSlotIndex: 0,
  initialBalls: [
    { wheelId: "wheel-top", ball: { id: "pearl-red", color: "red" } },
    { wheelId: "wheel-bottom", ball: { id: "pearl-blue", color: "blue" } }
  ]
};
