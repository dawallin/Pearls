import { expect, test, type Page } from "@playwright/test";

const targets = ["blue", "blue", "green", "green", "green", "red", "red", "red"];
const colors = ["blue", "red", "red", "red", "green", "green", "green", "blue"];
type CanvasBox = { x: number; y: number; width: number; height: number };

test("keeps target indicators with local slots and rejects an equal-count wrong arrangement", async ({ page }) => {
  test.slow();
  await openTest9(page);
  const box = await getCanvasBox(page);
  const before = await getPatternSnapshot(page);

  expect(before.components.wheel.targetColors).toEqual(targets);
  expect(before.components.wheel.targetIndicatorCenters).toHaveLength(8);

  await rotateWheel(page, box);
  const afterRotation = await getPatternSnapshot(page);
  for (let localSlot = 0; localSlot < 8; localSlot += 1) {
    const previousCenter = before.components.wheel.targetIndicatorCenters[(localSlot + 1) % 8];
    const currentCenter = afterRotation.components.wheel.targetIndicatorCenters[localSlot];
    expect(currentCenter.x).toBeCloseTo(previousCenter.x, 3);
    expect(currentCenter.y).toBeCloseTo(previousCenter.y, 3);
    expect(normalizeAngle(afterRotation.components.wheel.targetIndicatorRotations[localSlot] - before.components.wheel.targetIndicatorRotations[localSlot])).toBeCloseTo(Math.PI / 4, 3);
  }

  for (let placement = 0; placement < colors.length; placement += 1) {
    const snapshot = await getPatternSnapshot(page);
    const ballId = `ball-${colors[placement]}-${String(placement + 1).padStart(2, "0")}`;
    const localSlot = (7 - placement + 8) % 8;
    await dispatchBall(page, box, ballId, localSlot);
    if (placement < colors.length - 1) {
      await rotateWheel(page, box);
      await waitForDispatcherBall(page, `ball-${colors[placement + 1]}-${String(placement + 2).padStart(2, "0")}`);
    }
    expect(snapshot.components.wheel.clearCount).toBe(0);
  }

  const fullWrongArrangement = await getPatternSnapshot(page);
  expect(fullWrongArrangement.components.wheel.slots.map((ball) => ball?.color)).toEqual([
    "blue", "green", "green", "green", "red", "red", "red", "blue"
  ]);
  expect(fullWrongArrangement.components.wheel.slots.map((ball) => ball?.color).sort()).toEqual([...targets].sort());
  expect(fullWrongArrangement.components.wheel.clearCount).toBe(0);
  expect(fullWrongArrangement.components.wheel.lastClearEvent).toBeNull();
});

test("solves and clears the authored pattern twice", async ({ page }) => {
  test.slow();
  await openTest9(page);
  const box = await getCanvasBox(page);

  for (let cycle = 0; cycle < 2; cycle += 1) {
    if (cycle > 0) await rotateWheel(page, box);
    for (let placement = 0; placement < colors.length; placement += 1) {
      const snapshot = await getPatternSnapshot(page);
      const sequenceNumber = cycle * colors.length + placement + 1;
      const ballId = `ball-${colors[placement]}-${String(sequenceNumber).padStart(2, "0")}`;
      const localSlot = (8 - placement) % 8;
      await dispatchBall(page, box, ballId, localSlot, cycle + 1);
      if (placement < colors.length - 1) {
        await rotateWheel(page, box);
        const nextSequenceNumber = sequenceNumber + 1;
        await waitForDispatcherBall(page, `ball-${colors[(placement + 1) % colors.length]}-${String(nextSequenceNumber).padStart(2, "0")}`);
      }
      expect(snapshot.components.wheel.clearCount).toBe(cycle);
    }

    const solved = await getPatternSnapshot(page);
    expect(solved.components.wheel.slots).toEqual(Array(8).fill(null));
    expect(solved.components.wheel.clearCount).toBe(cycle + 1);
    expect(solved.components.wheel.lastClearEvent).toMatchObject({
      type: "WHEEL_CLEARED",
      clearCount: cycle + 1,
      consumedBallIds: expect.arrayContaining(Array.from({ length: 8 }, (_, index) => `ball-${colors[index]}-${String(cycle * 8 + index + 1).padStart(2, "0")}`))
    });
  }
});

type PatternSnapshot = {
  levelId: string;
  transitInProgress: boolean;
  components: {
    dispatcher: { ball: { id: string; color: string } | null; center: { x: number; y: number } };
    wheel: {
      center: { x: number; y: number };
      rotationStep: number;
      isAnimating: boolean;
      targetColors: string[];
      targetIndicatorCenters: Array<{ x: number; y: number }>;
      targetIndicatorRotations: number[];
      slots: Array<{ id: string; color: string } | null>;
      clearCount: number;
      lastClearEvent: { type: string; clearCount: number; consumedBallIds: string[] } | null;
    };
  };
};

async function openTest9(page: Page): Promise<void> {
  await page.goto("/?test=test-9");
  await page.waitForFunction(() => Boolean(globalThis.__PEARLS__));
  await expect.poll(async () => (await getPatternSnapshot(page)).levelId).toBe("test-fixed-pattern-wheel-clear-3x8");
}

async function getCanvasBox(page: Page) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Expected the Phaser canvas to have a bounding box.");
  return box;
}

async function getPatternSnapshot(page: Page): Promise<PatternSnapshot> {
  return page.evaluate(() => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) throw new Error("Expected Pearls debug surface to exist.");
    return pearls.getSnapshot() as PatternSnapshot;
  });
}

async function dispatchBall(page: Page, box: CanvasBox, ballId: string, localSlot: number, cycle: number = 1): Promise<void> {
  const snapshot = await getPatternSnapshot(page);
  await page.mouse.click(box.x + snapshot.components.dispatcher.center.x, box.y + snapshot.components.dispatcher.center.y);
  await page.waitForFunction(({ ballId, localSlot, clearCount }) => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const current = pearls.getSnapshot() as PatternSnapshot;
    return current.components.wheel.clearCount > clearCount
      ? true
      : current.components.wheel.slots[localSlot]?.id === ballId;
  }, { ballId, localSlot, clearCount: cycle - 1 });
}

async function rotateWheel(page: Page, box: CanvasBox): Promise<void> {
  const snapshot = await getPatternSnapshot(page);
  const nextRotation = (snapshot.components.wheel.rotationStep + 1) % 8;
  await page.mouse.click(box.x + snapshot.components.wheel.center.x, box.y + snapshot.components.wheel.center.y);
  await page.waitForFunction((rotationStep) => {
    const pearls = globalThis.__PEARLS__;
    if (!pearls) return false;
    const current = pearls.getSnapshot() as PatternSnapshot;
    return current.components.wheel.rotationStep === rotationStep && !current.components.wheel.isAnimating;
  }, nextRotation);
}

async function waitForDispatcherBall(page: Page, ballId: string): Promise<void> {
  await page.waitForFunction((expectedBallId) => {
    const pearls = globalThis.__PEARLS__;
    return Boolean(pearls && (pearls.getSnapshot() as PatternSnapshot).components.dispatcher.ball?.id === expectedBallId);
  }, ballId);
}

function normalizeAngle(angle: number): number {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}


test("Test 9 opposing wheel and dispatcher pearls collide and leave the dispatcher usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openTest9(page);
  const box = await getCanvasBox(page);
  await dispatchBall(page, box, "ball-blue-01", 0);
  await waitForDispatcherBall(page, "ball-red-02");
  await page.evaluate(() => {
    const debug = globalThis.__PEARLS__!;
    debug.pressDispatcher();
    debug.ejectWheelPearl?.(0);
    debug.advanceTime?.(1600);
  });
  const after = await page.evaluate(() => globalThis.__PEARLS__!.getSnapshot()) as PatternSnapshot & { lastEvents: Array<{ type: string; ballIds?: string[] }>; lastBurnEvent: { ballId: string } | null; activeTransits: unknown[] };
  expect(after.lastEvents.filter((event) => event.type === "BALL_COLLIDED")).toEqual([
    expect.objectContaining({ ballIds: ["ball-blue-01", "ball-red-02"] })
  ]);
  expect(after.lastBurnEvent?.ballId).toBe("ball-red-02");
  expect(after.components.wheel.slots[0]?.id).toBe("ball-blue-01");
  expect(after.components.dispatcher.ball?.id).toBe("ball-red-03");
  expect(after.activeTransits).toEqual([]);
  await page.evaluate(() => {
    const debug = globalThis.__PEARLS__!;
    debug.ejectWheelPearl?.(0);
    debug.advanceTime?.(1000);
    debug.pressDispatcher();
    debug.advanceTime?.(1000);
  });
  const reused = await getPatternSnapshot(page);
  expect(reused.components.wheel.slots[0]?.id).toBe("ball-red-03");
  expect(reused.components.dispatcher.ball?.id).toBe("ball-red-04");
  expect(errors).toEqual([]);
});
