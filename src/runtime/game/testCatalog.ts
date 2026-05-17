import Phaser from "phaser";

import { testDispatcherSlideWheel3x8Level } from "../../core/levels/test/testDispatcherSlideWheel3x8Level";
import { testDoubleDispatcherWheel8x8Level } from "../../core/levels/test/testDoubleDispatcherWheel8x8Level";
import { TestWheelScene } from "../scenes/TestWheelScene";
import { TestBoardScene } from "../scenes/TestBoardScene";

export type TestCatalogEntry = Readonly<{
  slug: string;
  title: string;
  description: string;
  createScene: () => Phaser.Scene;
}>;

export const TEST_CATALOG: readonly TestCatalogEntry[] = [
  {
    slug: "test-1",
    title: "Test 1",
    description: "Single 3x3 wheel board for isolated wheel rotation testing.",
    createScene: () => new TestWheelScene()
  },
  {
    slug: "test-2",
    title: "Test 2",
    description: "3x8 dispatcher-slide-wheel board with 3x3 endpoints and two slide cells.",
    createScene: () =>
      new TestBoardScene({
        level: testDispatcherSlideWheel3x8Level
      })
  },
  {
    slug: "test-3",
    title: "Test 3",
    description: "8x8 board with a down dispatcher, a wheel, and a right-facing dispatcher beside it.",
    createScene: () =>
      new TestBoardScene({
        level: testDoubleDispatcherWheel8x8Level,
        controller: {
          dispatchers: [
            {
              id: "dispatcher-01",
              slideId: "slide-01-a",
              hasInitialBall: true,
              connectedWorldSlotIndex: 0
            },
            {
              id: "dispatcher-right-01",
              slideId: "slide-right-b",
              hasInitialBall: true,
              connectedWorldSlotIndex: 6
            }
          ],
          wheelId: "wheel-01",
          wheelSlotCount: 8
        }
      })
  }
];

export function findTestBySlug(slug: string | null): TestCatalogEntry | null {
  if (!slug) {
    return null;
  }

  return TEST_CATALOG.find((entry) => entry.slug === slug) ?? null;
}
