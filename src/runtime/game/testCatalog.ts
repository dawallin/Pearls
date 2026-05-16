import Phaser from "phaser";

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
    slug: "test-0",
    title: "Test 0",
    description: "Single 1x1 wheel board for isolated wheel rotation testing.",
    createScene: () => new TestWheelScene()
  },
  {
    slug: "test-1",
    title: "Test 1",
    description: "DispatcherDown -> VerticalSlide -> Wheel on a 1x3 board.",
    createScene: () => new TestBoardScene()
  }
];

export function findTestBySlug(slug: string | null): TestCatalogEntry | null {
  if (!slug) {
    return null;
  }

  return TEST_CATALOG.find((entry) => entry.slug === slug) ?? null;
}
