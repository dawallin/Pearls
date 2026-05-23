import { createGridLevelDefinition } from "../../level/gridLevel";

export const testColoredDispatcherSlideWheel3x8Level = createGridLevelDefinition({
  id: "test-colored-dispatcher-slide-wheel-3x8",
  name: "Test Colored Dispatcher Slide Wheel 3x8",
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
        initialBall: {
          id: "ball-red",
          color: "red"
        },
        refillQueue: [
          {
            id: "ball-green",
            color: "green",
            delayMs: 2000
          },
          {
            id: "ball-blue",
            color: "blue",
            delayMs: 2000
          }
        ]
      }
    },
    {
      column: 1,
      row: 3,
      component: {
        type: "verticalSlide",
        id: "slide-01-a"
      }
    },
    {
      column: 1,
      row: 4,
      component: {
        type: "verticalSlide",
        id: "slide-01-b"
      }
    },
    {
      column: 0,
      row: 5,
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
