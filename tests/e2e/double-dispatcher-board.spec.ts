import { expect, test } from "@playwright/test";

test("dispatches from both dispatchers on the 8x8 board", async ({ page }) => {
  await page.goto("/?test=test-3");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const initialSnapshot = await page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as {
      levelId: string;
      grid: { columns: number; rows: number };
      components: {
        dispatchers: Array<{
          id: string;
          hasBall: boolean;
          center: { x: number; y: number };
        }>;
        wheel: {
          slots: readonly (string | null)[];
        };
      };
    };
  });

  expect(initialSnapshot).toMatchObject({
    levelId: "test-double-dispatcher-wheel-8x8",
    grid: {
      columns: 8,
      rows: 8
    }
  });

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  const topDispatcher = initialSnapshot.components.dispatchers.find(
    (dispatcher) => dispatcher.id === "dispatcher-01"
  );
  const leftDispatcher = initialSnapshot.components.dispatchers.find(
    (dispatcher) => dispatcher.id === "dispatcher-right-01"
  );

  if (!topDispatcher || !leftDispatcher) {
    throw new Error("Expected both dispatchers to exist in the debug snapshot.");
  }

  await page.mouse.click(box.x + topDispatcher.center.x, box.y + topDispatcher.center.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      transitInProgress: boolean;
      components: {
        wheel: { slots: readonly (string | null)[] };
      };
    };

    return !snapshot.transitInProgress && snapshot.components.wheel.slots[0] !== null;
  });

  await page.mouse.click(box.x + leftDispatcher.center.x, box.y + leftDispatcher.center.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      transitInProgress: boolean;
      components: {
        dispatchers: Array<{ id: string; hasBall: boolean }>;
        wheel: { slots: readonly (string | null)[] };
      };
    };

    const top = snapshot.components.dispatchers.find(
      (dispatcher) => dispatcher.id === "dispatcher-01"
    );
    const left = snapshot.components.dispatchers.find(
      (dispatcher) => dispatcher.id === "dispatcher-right-01"
    );

    return (
      !snapshot.transitInProgress &&
      top?.hasBall === false &&
      left?.hasBall === false &&
      snapshot.components.wheel.slots[0] !== null &&
      snapshot.components.wheel.slots[6] !== null
    );
  });
});
