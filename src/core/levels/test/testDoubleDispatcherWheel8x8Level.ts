import { createGridLevelDefinition } from "../../level/gridLevel";

export const testDoubleDispatcherWheel8x8Level = createGridLevelDefinition({
  id: "test-double-dispatcher-wheel-8x8",
  name: "Test Double Dispatcher Wheel 8x8",
  columns: 8,
  rows: 8,
  cells: [
    {
      column: 5,
      row: 0,
      width: 3,
      height: 3,
      component: {
        type: "dispatcherDown",
        id: "dispatcher-01",
        hasInitialBall: true
      }
    },
    {
      column: 6,
      row: 3,
      component: {
        type: "verticalSlide",
        id: "slide-01-a"
      }
    },
    {
      column: 6,
      row: 4,
      component: {
        type: "verticalSlide",
        id: "slide-01-b"
      }
    },
    {
      column: 3,
      row: 6,
      component: {
        type: "horizontalSlide",
        id: "slide-right-a"
      }
    },
    {
      column: 4,
      row: 6,
      component: {
        type: "horizontalSlide",
        id: "slide-right-b"
      }
    },
    {
      column: 0,
      row: 5,
      width: 3,
      height: 3,
      component: {
        type: "dispatcherRight",
        id: "dispatcher-right-01",
        hasInitialBall: true
      }
    },
    {
      column: 5,
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
