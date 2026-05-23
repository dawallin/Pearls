import { expect, test } from "@playwright/test";

test("dispatches red, green, then blue with deterministic refills", async ({ page }) => {
  await page.goto("/?test=test-5");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  const initialSnapshot = await getColoredDispatchSnapshot(page);

  expect(initialSnapshot).toMatchObject({
    levelId: "test-colored-dispatcher-slide-wheel-3x8",
    components: {
      dispatcher: {
        ball: {
          id: "ball-red",
          color: "red"
        }
      }
    }
  });

  await dispatchCurrentBall(page, box);
  await rotateWheel(page, box);
  await advanceTime(page, 2000);
  expect((await getColoredDispatchSnapshot(page)).components.dispatcher.ball).toEqual({
    id: "ball-green",
    color: "green"
  });

  await dispatchCurrentBall(page, box);
  await rotateWheel(page, box);
  await advanceTime(page, 2000);
  expect((await getColoredDispatchSnapshot(page)).components.dispatcher.ball).toEqual({
    id: "ball-blue",
    color: "blue"
  });

  await dispatchCurrentBall(page, box);
  await rotateWheel(page, box);
  await advanceTime(page, 4000);

  const finalSnapshot = await getColoredDispatchSnapshot(page);

  expect(finalSnapshot.components.dispatcher.ball).toBeNull();
  expect(finalSnapshot.components.wheel.slots[0]).toEqual({
    id: "ball-red",
    color: "red"
  });
  expect(finalSnapshot.components.wheel.slots[6]).toEqual({
    id: "ball-blue",
    color: "blue"
  });
  expect(finalSnapshot.components.wheel.slots[7]).toEqual({
    id: "ball-green",
    color: "green"
  });
  expect(finalSnapshot.components.wheel.slots.filter(Boolean)).toEqual([
    {
      id: "ball-red",
      color: "red"
    },
    {
      id: "ball-blue",
      color: "blue"
    },
    {
      id: "ball-green",
      color: "green"
    }
  ]);
});

type ColoredDispatchSnapshot = {
  levelId: string;
  transitInProgress: boolean;
  components: {
    dispatcher: {
      ball: { id: string; color: "red" | "green" | "blue" } | null;
      center: { x: number; y: number };
    };
    wheel: {
      center: { x: number; y: number };
      isAnimating: boolean;
      rotationStep: number;
      slots: Array<{ id: string; color: "red" | "green" | "blue" } | null>;
    };
  };
};

async function getColoredDispatchSnapshot(
  page: import("@playwright/test").Page
): Promise<ColoredDispatchSnapshot> {
  return page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as ColoredDispatchSnapshot;
  });
}

async function dispatchCurrentBall(
  page: import("@playwright/test").Page,
  box: NonNullable<Awaited<ReturnType<import("@playwright/test").Locator["boundingBox"]>>>
): Promise<void> {
  const snapshot = await getColoredDispatchSnapshot(page);

  if (!snapshot.components.dispatcher.ball) {
    throw new Error("Expected dispatcher to hold a ball.");
  }

  await page.mouse.click(
    box.x + snapshot.components.dispatcher.center.x,
    box.y + snapshot.components.dispatcher.center.y
  );
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as ColoredDispatchSnapshot;
    return !snapshot.transitInProgress;
  });
}

async function rotateWheel(
  page: import("@playwright/test").Page,
  box: NonNullable<Awaited<ReturnType<import("@playwright/test").Locator["boundingBox"]>>>
): Promise<void> {
  const snapshot = await getColoredDispatchSnapshot(page);
  const nextRotationStep = (snapshot.components.wheel.rotationStep + 1) % 8;

  await page.mouse.click(
    box.x + snapshot.components.wheel.center.x,
    box.y + snapshot.components.wheel.center.y
  );
  await page.waitForFunction((rotationStep) => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as ColoredDispatchSnapshot;
    return (
      snapshot.components.wheel.rotationStep === rotationStep &&
      snapshot.components.wheel.isAnimating === false
    );
  }, nextRotationStep);
}

async function advanceTime(
  page: import("@playwright/test").Page,
  deltaMs: number
): Promise<void> {
  await page.evaluate((ms) => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls?.advanceTime) {
      throw new Error("Expected Pearls debug surface to expose advanceTime.");
    }

    pearls.advanceTime(ms);
  }, deltaMs);
}
