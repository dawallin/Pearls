import Phaser from "phaser";

import { testDispatcherSlideWheel3x8Level } from "../../core/levels/test/testDispatcherSlideWheel3x8Level";
import { testColoredDispatcherSlideWheel3x8Level } from "../../core/levels/test/testColoredDispatcherSlideWheel3x8Level";
import { testDoubleDispatcherWheel8x8Level } from "../../core/levels/test/testDoubleDispatcherWheel8x8Level";
import { testWheelTransfer3x8Level } from "../../core/levels/test/testWheelTransfer3x8Level";
import { testWheelBounce3x8Level } from "../../core/levels/test/testWheelBounce3x8Level";
import { TestWheelScene } from "../scenes/TestWheelScene";
import { TestBoardScene } from "../scenes/TestBoardScene";
import { TestWheelTransferScene } from "../scenes/TestWheelTransferScene";

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
  },
  {
    slug: "test-4",
    title: "Test 4",
    description: "3x8 board with two wheels connected by two slides for reversible ball transfer.",
    createScene: () =>
      new TestWheelTransferScene({
        level: testWheelTransfer3x8Level
      })
  },
  {
    slug: "test-5",
    title: "Test 5",
    description: "3x8 dispatcher-slide-wheel board with red, green, and blue deterministic refills.",
    createScene: () =>
      new TestBoardScene({
        level: testColoredDispatcherSlideWheel3x8Level,
        controller: {
          dispatcherId: "dispatcher-01",
          slideId: "slide-01-a",
          wheelId: "wheel-01",
          wheelSlotCount: 8,
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
      })
  },
  {
    slug: "test-6",
    title: "Test 6",
    description: "3x8 two-wheel board where a transfer bounces off an occupied destination hole.",
    createScene: () =>
      new TestWheelTransferScene({
        level: testWheelBounce3x8Level,
        controller: {
          topWheelId: "wheel-top",
          bottomWheelId: "wheel-bottom",
          wheelSlotCount: 8,
          initialBallWheelIds: ["wheel-top", "wheel-bottom"]
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
