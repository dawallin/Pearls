import { expect, test } from "@playwright/test";

test("bounces the top ball back from an occupied bottom wheel slot", async ({ page }) => {
  await page.goto("/?test=test-6");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  const initialSnapshot = await getBounceSnapshot(page);

  expect(initialSnapshot.levelId).toBe("test-wheel-bounce-3x8");
  expect(initialSnapshot.components.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
  expect(initialSnapshot.components.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");

  const topBall = initialSnapshot.components.wheels["wheel-top"].ballCenter;

  if (!topBall) {
    throw new Error("Expected top wheel to expose a ball center.");
  }

  await page.mouse.click(box.x + topBall.x, box.y + topBall.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as BounceSnapshot;
    return !snapshot.transitInProgress;
  });

  const bouncedSnapshot = await getBounceSnapshot(page);

  expect(bouncedSnapshot.lastEvents).toContainEqual(
    expect.objectContaining({
      type: "BALL_BOUNCED",
      ballId: "transfer-ball",
      fromWheelId: "wheel-top",
      toWheelId: "wheel-bottom",
      sourceLocalSlotIndex: 4,
      targetLocalSlotIndex: 0
    })
  );
  const bounceEvent = bouncedSnapshot.lastEvents.find((event) => event.type === "BALL_BOUNCED") as { localProgress?: number } | undefined;
  expect(bounceEvent?.localProgress).toBeLessThan(1_334);
  expect(bouncedSnapshot.components.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
  expect(bouncedSnapshot.components.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");

  const bottomBall = bouncedSnapshot.components.wheels["wheel-bottom"].ballCenter;

  if (!bottomBall) {
    throw new Error("Expected bottom wheel to expose a ball center.");
  }

  await page.mouse.click(box.x + bottomBall.x, box.y + bottomBall.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      return false;
    }

    const snapshot = pearls.getSnapshot() as BounceSnapshot;
    return !snapshot.transitInProgress && snapshot.lastEvents.some(
      (event) => event.type === "BALL_BOUNCED" && event.ballId === "blocking-ball"
    );
  });

  const upwardBounceSnapshot = await getBounceSnapshot(page);

  expect(upwardBounceSnapshot.lastEvents).toContainEqual(
    expect.objectContaining({
      type: "BALL_BOUNCED",
      ballId: "blocking-ball",
      fromWheelId: "wheel-bottom",
      toWheelId: "wheel-top",
      sourceLocalSlotIndex: 0,
      targetLocalSlotIndex: 4
    })
  );
  expect(upwardBounceSnapshot.components.wheels["wheel-top"].slotBallIds[4]).toBe("transfer-ball");
  expect(upwardBounceSnapshot.components.wheels["wheel-bottom"].slotBallIds[0]).toBe("blocking-ball");

  await page.evaluate(() => {
    globalThis.__PEARLS__?.setSimulationSpeed?.(0.25);
    globalThis.__PEARLS__?.requestRotateTurn?.("wheel-bottom");
  });
  await page.waitForFunction(() => {
    const wheel = (globalThis.__PEARLS__?.getSnapshot() as BounceSnapshot | undefined)?.components.wheels["wheel-bottom"];
    return wheel?.rotationStep === 1 && wheel.isAnimating === true && wheel.targetAngle === 45 && wheel.pendingTurns === 0;
  });
  await page.waitForFunction(() => {
    const wheel = (globalThis.__PEARLS__?.getSnapshot() as BounceSnapshot | undefined)?.components.wheels["wheel-bottom"];
    return wheel?.isAnimating === false;
  });
});

type BounceSnapshot = {
  levelId: string;
  transitInProgress: boolean;
  lastEvents: Array<Record<string, any>>;
  components: {
    wheels: Record<string, {
      ballCenter: { x: number; y: number } | null;
      slotBallIds: readonly (string | null)[];
      rotationStep: number;
      targetAngle: number;
      pendingTurns: number;
      isAnimating: boolean;
    }>;
  };
};

async function getBounceSnapshot(
  page: import("@playwright/test").Page
): Promise<BounceSnapshot> {
  return page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;

    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }

    return pearls.getSnapshot() as BounceSnapshot;
  });
}
