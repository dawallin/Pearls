import { expect, test } from "@playwright/test";

test("keeps 1x1 wheel animation moving smoothly in one direction during a turn", async ({
  page
}) => {
  await page.goto("/?test=test-0");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const samples = await page.evaluate(async () => {
    const values: number[] = [];

    for (let i = 0; i < 10; i += 1) {
      const pearls = globalThis.__PEARLS__;

      if (!pearls) {
        throw new Error("Expected Pearls debug surface to exist.");
      }

      const snapshot = pearls.getSnapshot() as {
        wheel: {
          visualRotation: number;
        };
      };

      values.push(snapshot.wheel.visualRotation);
      await new Promise((resolve) => setTimeout(resolve, 24));
    }

    return values;
  });

  for (let i = 1; i < samples.length; i += 1) {
    expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    expect(samples[i] - samples[i - 1]).toBeLessThan(1.2);
  }

  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as {
      wheel: {
        rotationStep: number;
        isAnimating: boolean;
        visualRotation: number;
      };
    };

    return (
      snapshot.wheel.rotationStep === 1 &&
      snapshot.wheel.isAnimating === false &&
      snapshot.wheel.visualRotation > 0.7
    );
  });
});
