import { createGridLevelDefinition } from "../../level/gridLevel";

export const testDispatcherSlideWheel1x3Level = createGridLevelDefinition({
  id: "test-dispatcher-slide-wheel-1x3",
  name: "Test Dispatcher Slide Wheel 1x3",
  columns: 1,
  rows: 3,
  cells: [
    {
      column: 0,
      row: 0,
      component: {
        type: "dispatcherDown",
        id: "dispatcher-01",
        hasInitialBall: true
      }
    },
    {
      column: 0,
      row: 1,
      component: {
        type: "verticalSlide",
        id: "slide-01"
      }
    },
    {
      column: 0,
      row: 2,
      component: {
        type: "wheel",
        id: "wheel-01",
        slotCount: 8
      }
    }
  ]
});
