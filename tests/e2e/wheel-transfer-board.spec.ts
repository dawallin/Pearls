import { expect, test } from "@playwright/test";

test("transfers a ball between two wheels only when slide-aligned", async ({ page }) => {
  await page.goto("/?test=test-4");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  const initialSnapshot = await page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as {
      levelId: string;
      grid: { columns: number; rows: number };
      components: {
        wheels: Record<string, {
          hasBall: boolean;
          ballLocalSlotIndex: number | null;
          ballCenter: { x: number; y: number } | null;
          slotCenters: Array<{ x: number; y: number } | null>;
          center: { x: number; y: number };
        }>;
      };
    };
  });

  expect(initialSnapshot).toMatchObject({
    levelId: "test-wheel-transfer-3x8",
    grid: {
      columns: 3,
      rows: 8
    }
  });
  expect(initialSnapshot.components.wheels["wheel-top"]).toMatchObject({
    hasBall: true,
    ballLocalSlotIndex: 4
  });
  expect(initialSnapshot.components.wheels["wheel-bottom"].hasBall).toBe(false);

  const topCenter = initialSnapshot.components.wheels["wheel-top"].center;
  const topBall = await getBallPoint(page, "wheel-top");
  const emptyTopSlot = await getSlotPoint(page, "wheel-top", 0);

  await page.mouse.click(box.x + emptyTopSlot.x, box.y + emptyTopSlot.y);

  const afterEmptySlotClick = await page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as {
      components: {
        wheels: Record<string, { rotationStep: number; hasBall: boolean }>;
      };
      transitInProgress: boolean;
    };
  });

  expect(afterEmptySlotClick.components.wheels["wheel-top"].rotationStep).toBe(0);
  expect(afterEmptySlotClick.components.wheels["wheel-top"].hasBall).toBe(true);
  expect(afterEmptySlotClick.transitInProgress).toBe(false);

  await page.mouse.click(box.x + topBall.x, box.y + topBall.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      transitInProgress: boolean;
      components: {
        wheels: Record<string, { hasBall: boolean; ballLocalSlotIndex: number | null }>;
      };
    };

    return (
      !snapshot.transitInProgress &&
      snapshot.components.wheels["wheel-top"].hasBall === false &&
      snapshot.components.wheels["wheel-bottom"].ballLocalSlotIndex === 0
    );
  });

  const bottomBall = await getBallPoint(page, "wheel-bottom");

  await page.mouse.click(box.x + bottomBall.x, box.y + bottomBall.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      transitInProgress: boolean;
      components: {
        wheels: Record<string, { hasBall: boolean; ballLocalSlotIndex: number | null }>;
      };
    };

    return (
      !snapshot.transitInProgress &&
      snapshot.components.wheels["wheel-top"].ballLocalSlotIndex === 4 &&
      snapshot.components.wheels["wheel-bottom"].hasBall === false
    );
  });

  await page.mouse.click(box.x + topCenter.x, box.y + topCenter.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      components: {
        wheels: Record<string, { rotationStep: number; isAnimating: boolean }>;
      };
    };

    return (
      snapshot.components.wheels["wheel-top"].rotationStep === 1 &&
      snapshot.components.wheels["wheel-top"].isAnimating === false
    );
  });

  const rotatedTopBall = await getBallPoint(page, "wheel-top");
  await page.mouse.click(box.x + rotatedTopBall.x, box.y + rotatedTopBall.y);

  const blockedSnapshot = await page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as {
      components: {
        wheels: Record<string, { hasBall: boolean; ballLocalSlotIndex: number | null }>;
      };
      transitInProgress: boolean;
      lastEvents: Array<{ type: string }>;
    };
  });

  expect(blockedSnapshot.transitInProgress).toBe(false);
  expect(blockedSnapshot.components.wheels["wheel-top"].hasBall).toBe(true);
  expect(blockedSnapshot.components.wheels["wheel-bottom"].hasBall).toBe(false);
  expect(blockedSnapshot.lastEvents).toEqual([]);
});

async function getBallPoint(
  page: import("@playwright/test").Page,
  wheelId: string
): Promise<{ x: number; y: number }> {
  return page.evaluate((targetWheelId) => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    const snapshot = pearls.getSnapshot() as {
      components: {
        wheels: Record<string, {
          ballLocalSlotIndex: number | null;
          ballCenter: { x: number; y: number } | null;
          slotCenters: Array<{ x: number; y: number } | null>;
          center: { x: number; y: number };
        }>;
      };
    };
    const wheel = snapshot.components.wheels[targetWheelId];

    if (!wheel || wheel.ballLocalSlotIndex === null || !wheel.ballCenter) {
      throw new Error(`Expected ${targetWheelId} to contain a ball.`);
    }

    return wheel.ballCenter;
  }, wheelId);
}

async function getSlotPoint(
  page: import("@playwright/test").Page,
  wheelId: string,
  localSlotIndex: number
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ targetWheelId, slotIndex }) => {
      const pearls = globalThis.__PEARLS__;

      if (!pearls) {
        throw new Error("Expected Pearls debug surface to exist.");
      }

      const snapshot = pearls.getSnapshot() as {
        components: {
          wheels: Record<string, {
            slotCenters: Array<{ x: number; y: number } | null>;
          }>;
        };
      };
      const slotCenter = snapshot.components.wheels[targetWheelId]?.slotCenters[slotIndex];

      if (!slotCenter) {
        throw new Error(`Expected ${targetWheelId} slot ${slotIndex} to have a center.`);
      }

      return slotCenter;
    },
    {
      targetWheelId: wheelId,
      slotIndex: localSlotIndex
    }
  );
}
