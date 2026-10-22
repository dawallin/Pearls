import { expect, test } from "@playwright/test";

test("red and blue pearls collide, reverse, and return through authoritative snapshots", async ({ page }) => {
  await page.goto("/?test=test-7");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Expected the Phaser canvas to have a bounding box.");

  const initial = await snapshot(page);
  expect(initial.levelId).toBe("test-multi-pearl-collision-3x10");
  await page.evaluate(() => globalThis.__PEARLS__?.setSimulationSpeed?.(0.25));
  expect((await snapshot(page)).simulationSpeed).toBe(0.25);
  await page.evaluate(() => globalThis.__PEARLS__?.setSimulationSpeed?.(1));
  await page.evaluate(() => globalThis.__PEARLS__?.setSimulationSpeed?.(0.25));
  expect(initial.components.wheels["wheel-top"].slots[4]).toEqual({ id: "pearl-red", color: "red" });
  expect(initial.components.wheels["wheel-bottom"].slots[0]).toEqual({ id: "pearl-blue", color: "blue" });

  await page.mouse.click(box.x + initial.components.wheels["wheel-top"].ballCenter.x, box.y + initial.components.wheels["wheel-top"].ballCenter.y);
  const afterFirst = await snapshot(page);
  await page.mouse.click(box.x + afterFirst.components.wheels["wheel-bottom"].ballCenter.x, box.y + afterFirst.components.wheels["wheel-bottom"].ballCenter.y);

  await page.waitForFunction(() => {
    const state = globalThis.__PEARLS__?.getSnapshot() as { activeTransits: unknown[] } | undefined;
    return state?.activeTransits.length === 2;
  });
  // Capture geometry and request rotation atomically, so a queued launch or normal movement
  // between browser round trips cannot be mistaken for rotation changing the slide path.
  const geometry = await page.evaluate(() => {
    const debug = globalThis.__PEARLS__!;
    const project = () => (debug.getSnapshot() as any).activeTransits.map((transit: any) => ({
      ball: transit.ball, pathId: transit.pathId, segment: transit.segment, fromWheelId: transit.fromWheelId
    }));
    const before = project();
    debug.requestRotateTurn("wheel-top");
    debug.requestRotateTurn("wheel-top");
    return { before, after: project() };
  });
  expect(geometry.after).toEqual(geometry.before);
  await page.waitForFunction(() => {
    const state = globalThis.__PEARLS__?.getSnapshot() as any;
    return state?.components.wheels["wheel-top"].rotationStep === 1;
  });
  const rotated = await snapshot(page);
  expect(rotated.components.wheels["wheel-top"]).toMatchObject({ rotationStep: 1, targetAngle: 45, pendingTurns: 0 });
  await page.evaluate(() => globalThis.__PEARLS__?.setSimulationSpeed?.(1));

  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    const state = pearls?.getSnapshot() as { activeTransits?: unknown[]; lastEvents?: Array<{ type: string }> } | undefined;
    return Boolean(state?.lastEvents?.some((event) => event.type === "BALL_COLLIDED"));
  });
  const contact = await snapshot(page);
  expect(contact.activeTransits).toEqual(expect.arrayContaining([
    expect.objectContaining({ currentSegmentId: expect.any(String), currentComponentId: expect.any(String), localProgress: expect.any(Number), direction: expect.any(String), segment: expect.objectContaining({ componentId: expect.any(String) }) })
  ]));
  expect(contact.lastEvents).toContainEqual(expect.objectContaining({ type: "BALL_COLLIDED", segmentId: expect.any(String) }));
  await page.waitForFunction(() => {
    const pearls = globalThis.__PEARLS__;
    const state = pearls?.getSnapshot() as { transitInProgress?: boolean } | undefined;
    return state?.transitInProgress === false;
  });

  const settled = await snapshot(page);
  expect(settled.components.wheels["wheel-top"].slotBallIds[3]).toBe("pearl-red");
  expect(settled.components.wheels["wheel-bottom"].slotBallIds[0]).toBe("pearl-blue");
  expect(settled.lastEvents).toContainEqual(expect.objectContaining({ type: "BALL_COLLIDED", ballIds: ["pearl-blue", "pearl-red"] }));
});

async function snapshot(page: import("@playwright/test").Page): Promise<any> {
  return page.evaluate(() => globalThis.__PEARLS__?.getSnapshot());
}
