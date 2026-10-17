import { expect, test } from "@playwright/test";

test("clears the reusable harmony wheel twice", async ({ page }) => {
  test.slow();
  await page.goto("/?test=test-8");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Expected the Phaser canvas to have a bounding box.");
  }

  expect((await getHarmonySnapshot(page)).components.wheel).toMatchObject({
    clearRule: { type: "harmony" },
    clearCount: 0,
    slots: Array(8).fill(null)
  });

  await dispatchOneNonClearingPearl(page, box);
  expect((await getHarmonySnapshot(page)).components.wheel).toMatchObject({
    clearCount: 0,
    lastClearEvent: null,
    slots: [
      { id: "ball-red-01", color: "red" },
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  });
  await rotateWheel(page, box);
  await refillDispatcher(page);

  await fillHarmonyWheel(page, box, 1, 1);
  expect((await getHarmonySnapshot(page)).components.wheel).toMatchObject({
    clearCount: 1,
    slots: Array(8).fill(null),
    lastClearEvent: {
      type: "WHEEL_CLEARED",
      color: "red",
      clearCount: 1
    }
  });

  await refillDispatcher(page);
  await fillHarmonyWheel(page, box, 2);
  expect((await getHarmonySnapshot(page)).components.wheel).toMatchObject({
    clearCount: 2,
    slots: Array(8).fill(null),
    lastClearEvent: {
      type: "WHEEL_CLEARED",
      color: "red",
      clearCount: 2
    }
  });
});

test("keeps existing wheel occupants visible while a dispatcher refills during transit", async ({ page }) => {
  await page.goto("/?test=test-8");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Expected the Phaser canvas to have a bounding box.");

  await dispatchOneNonClearingPearl(page, box);
  await rotateWheel(page, box);
  await refillDispatcher(page);

  const beforeSecondDispatch = await getHarmonySnapshot(page);
  await page.mouse.click(
    box.x + beforeSecondDispatch.components.dispatcher.center.x,
    box.y + beforeSecondDispatch.components.dispatcher.center.y
  );
  await advanceTime(page, 250);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const snapshot = pearls.getSnapshot() as HarmonySnapshot;
    return snapshot.transitInProgress && snapshot.components.dispatcher.ball?.color === "red";
  });

  expect((await getHarmonySnapshot(page)).components.wheel.renderedSlots).toEqual([
    { id: "ball-red-01", color: "red" },
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ]);
});

test("dispatches into an occupied wheel, then bounces and burns at its refilled origin", async ({ page }) => {
  await page.goto("/?test=test-8");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Expected the Phaser canvas to have a bounding box.");
  await dispatchOneNonClearingPearl(page, box);
  await refillDispatcher(page);
  const snapshot = await getHarmonySnapshot(page);
  await page.mouse.click(box.x + snapshot.components.dispatcher.center.x, box.y + snapshot.components.dispatcher.center.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const current = pearls.getSnapshot() as HarmonySnapshot;
    return current.lastBurnEvent?.type === "BALL_BURNED_AT_DISPATCHER" && !current.transitInProgress;
  });
  const after = await getHarmonySnapshot(page);
  expect(after.components.wheel.slots[0]).toEqual({ id: "ball-red-01", color: "red" });
  expect(after.components.dispatcher.ball?.id).toBe("ball-red-03");
});

test("renders a correctly sized transit pearl and ejects a wheel pearl back through its adjacent slide", async ({ page }) => {
  await page.goto("/?test=test-8");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Expected the Phaser canvas to have a bounding box.");

  const initial = await getHarmonySnapshot(page);
  await page.mouse.click(box.x + initial.components.dispatcher.center.x, box.y + initial.components.dispatcher.center.y);
  await advanceTime(page, 128);
  const inTransit = await getHarmonySnapshot(page);
  expect(inTransit.transitVisuals["ball-red-01"]?.diameter).toBeCloseTo(inTransit.components.wheel.pearlDiameter, 4);

  await advanceTime(page, 500);
  const landed = await getHarmonySnapshot(page);
  if (!landed.components.wheel.ballCenter) throw new Error("Expected a wheel pearl at the slide-facing slot.");
  await page.mouse.click(box.x + landed.components.wheel.ballCenter.x, box.y + landed.components.wheel.ballCenter.y);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const snapshot = pearls.getSnapshot() as HarmonySnapshot;
    return snapshot.lastBurnEvent?.ballId === "ball-red-01" && !snapshot.transitInProgress;
  });

  expect((await getHarmonySnapshot(page)).components.wheel.slots).toEqual(Array(8).fill(null));
});

type HarmonySnapshot = {
  transitInProgress: boolean;
  lastBurnEvent: { type: string; ballId?: string } | null;
  transitVisuals: Record<string, { diameter: number }>;
  components: {
    dispatcher: {
      ball: { id: string; color: "red" | "green" | "blue" } | null;
      center: { x: number; y: number };
    };
    wheel: {
      center: { x: number; y: number };
      ballCenter: { x: number; y: number } | null;
      pearlDiameter: number;
      isAnimating: boolean;
      rotationStep: number;
      clearRule: { type: "harmony" } | undefined;
      clearCount: number;
      lastClearEvent: { type: "WHEEL_CLEARED"; color: string; clearCount: number } | null;
      renderedSlots: Array<{ id: string; color: "red" | "green" | "blue" } | null>;
      clearEffect: { active: boolean; targetCount: number };
      slots: Array<{ id: string; color: "red" | "green" | "blue" } | null>;
    };
  };
};

async function getHarmonySnapshot(page: import("@playwright/test").Page): Promise<HarmonySnapshot> {
  return page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) {
      throw new Error("Expected Pearls debug surface to exist.");
    }
    return pearls.getSnapshot() as HarmonySnapshot;
  });
}

async function fillHarmonyWheel(
  page: import("@playwright/test").Page,
  box: NonNullable<Awaited<ReturnType<import("@playwright/test").Locator["boundingBox"]>>>,
  expectedClearCount: number,
  existingPlacements = 0
): Promise<void> {
  for (let placement = existingPlacements; placement < 8; placement += 1) {
    const beforeDispatch = await getHarmonySnapshot(page);
    if (!beforeDispatch.components.dispatcher.ball) {
      throw new Error("Expected the dispatcher to hold a red pearl.");
    }

    await page.mouse.click(
      box.x + beforeDispatch.components.dispatcher.center.x,
      box.y + beforeDispatch.components.dispatcher.center.y
    );
    try {
      await page.waitForFunction(
        ({ clearCount, placement }) => {
          const pearls = globalThis.__PEARLS__;
          if (!pearls) return false;
          const snapshot = pearls.getSnapshot() as HarmonySnapshot;
          return (
            !snapshot.transitInProgress &&
            (placement < 7 || (
              snapshot.components.wheel.clearCount === clearCount &&
              snapshot.components.wheel.clearEffect.active &&
              snapshot.components.wheel.clearEffect.targetCount === 8
            ))
          );
        },
        { clearCount: expectedClearCount, placement },
        { timeout: 8_000 }
      );
    } catch (error) {
      const current = await getHarmonySnapshot(page);
      throw new Error(`Placement ${placement} did not settle: ${JSON.stringify(current)}\n${String(error)}`);
    }

    if (placement < 7) {
      await rotateWheel(page, box);
      await refillDispatcher(page);
    }
  }
}

async function dispatchOneNonClearingPearl(
  page: import("@playwright/test").Page,
  box: NonNullable<Awaited<ReturnType<import("@playwright/test").Locator["boundingBox"]>>>
): Promise<void> {
  const snapshot = await getHarmonySnapshot(page);
  await page.mouse.click(
    box.x + snapshot.components.dispatcher.center.x,
    box.y + snapshot.components.dispatcher.center.y
  );
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const current = pearls.getSnapshot() as HarmonySnapshot;
    return !current.transitInProgress && current.components.wheel.clearCount === 0;
  });
}

async function rotateWheel(
  page: import("@playwright/test").Page,
  box: NonNullable<Awaited<ReturnType<import("@playwright/test").Locator["boundingBox"]>>>
): Promise<void> {
  const beforeRotation = await getHarmonySnapshot(page);
  const nextRotation = (beforeRotation.components.wheel.rotationStep + 1) % 8;
  await page.mouse.click(
    box.x + beforeRotation.components.wheel.center.x,
    box.y + beforeRotation.components.wheel.center.y
  );
  await page.waitForFunction((rotationStep) => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const snapshot = pearls.getSnapshot() as HarmonySnapshot;
    return snapshot.components.wheel.rotationStep === rotationStep && !snapshot.components.wheel.isAnimating;
  }, nextRotation);
}

async function refillDispatcher(page: import("@playwright/test").Page): Promise<void> {
  await advanceTime(page, 250);
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const snapshot = pearls.getSnapshot() as HarmonySnapshot;
    return snapshot.components.dispatcher.ball?.color === "red";
  });
}

async function advanceTime(page: import("@playwright/test").Page, deltaMs: number): Promise<void> {
  await page.evaluate((ms) => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls?.advanceTime) {
      throw new Error("Expected Pearls debug surface to expose advanceTime.");
    }
    pearls.advanceTime(ms);
  }, deltaMs);
}
