import { expect, test } from "@playwright/test";

test("dispatches the ball down the board and then rotates the wheel clockwise", async ({
  page
}) => {
  await page.goto("/?test=test-1");
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
      components: {
        dispatcher: {
          id: string;
          hasBall: boolean;
          center: { x: number; y: number };
        };
        wheel: {
          id: string;
          hasBall: boolean;
          center: { x: number; y: number };
          rotationStep: number;
        };
      };
    };
  });

  await page.mouse.click(
    box.x + initialSnapshot.components.wheel.center.x,
    box.y + initialSnapshot.components.wheel.center.y
  );

  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      components: {
        wheel: { rotationStep: number; isAnimating: boolean };
      };
    };

    return (
      snapshot.components.wheel.rotationStep === 1 &&
      snapshot.components.wheel.isAnimating === false
    );
  });

  await page.mouse.click(
    box.x + initialSnapshot.components.dispatcher.center.x,
    box.y + initialSnapshot.components.dispatcher.center.y
  );

  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      components: {
        dispatcher: { hasBall: boolean };
        wheel: { hasBall: boolean; rotationStep: number };
      };
      transitInProgress: boolean;
    };

    return (
      snapshot.components.dispatcher.hasBall === false &&
      snapshot.components.wheel.hasBall === true &&
      snapshot.components.wheel.rotationStep === 1 &&
      snapshot.transitInProgress === false
    );
  });

  const landedSnapshot = await page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as {
      levelId: string;
      grid: { columns: number; rows: number };
      components: {
        dispatcher: { hasBall: boolean };
        wheel: {
          wheelId: string;
          hasBall: boolean;
          center: { x: number; y: number };
          rotationStep: number;
          pendingTurns: number;
          isAnimating: boolean;
        };
      };
    };
  });

  expect(landedSnapshot).toMatchObject({
    levelId: "test-dispatcher-slide-wheel-1x3",
    grid: {
      columns: 1,
      rows: 3
    }
  });
  expect(landedSnapshot.components.dispatcher.hasBall).toBe(false);
  expect(landedSnapshot.components.wheel).toMatchObject({
    hasBall: true,
    rotationStep: 1,
    pendingTurns: 0,
    isAnimating: false
  });

  await page.mouse.click(
    box.x + landedSnapshot.components.wheel.center.x,
    box.y + landedSnapshot.components.wheel.center.y
  );

  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      components: {
        wheel: {
          rotationStep: number;
          pendingTurns: number;
          isAnimating: boolean;
        };
      };
    };

    return (
      snapshot.components.wheel.rotationStep === 2 &&
      snapshot.components.wheel.pendingTurns === 0 &&
      snapshot.components.wheel.isAnimating === false
    );
  });
});
