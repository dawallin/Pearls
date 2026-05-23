import type { BallState } from "../ball/ballState";
import {
  createWheelState,
  getWheelSlotsSnapshot,
  getWheelWorldSlotOccupant,
  rotateWheelState,
  setWheelWorldSlotOccupant,
  worldToLocalSlot,
  type MutableWheelState
} from "../wheel/wheelState";

const TRANSFER_BALL_ID = "transfer-ball";
const TRANSFER_BALL: BallState = {
  id: TRANSFER_BALL_ID,
  color: "red"
};
const BLOCKING_BALL_ID = "blocking-ball";
const BLOCKING_BALL: BallState = {
  id: BLOCKING_BALL_ID,
  color: "red"
};

export type WheelTransferEvent =
  | Readonly<{
      type: "BALL_TRANSFERRED";
      ballId: string;
      fromWheelId: string;
      toWheelId: string;
      sourceLocalSlotIndex: number;
      targetLocalSlotIndex: number;
      tick: number;
    }>
  | Readonly<{
      type: "BALL_BOUNCED";
      ballId: string;
      fromWheelId: string;
      toWheelId: string;
      sourceLocalSlotIndex: number;
      targetLocalSlotIndex: number;
      tick: number;
    }>
  | Readonly<{
      type: "WHEEL_ROTATED";
      wheelId: string;
      steps: number;
      rotationStep: number;
      tick: number;
    }>;

export type WheelTransferConfig = Readonly<{
  topWheelId: string;
  bottomWheelId: string;
  wheelSlotCount: number;
  topConnectedWorldSlotIndex?: number;
  bottomConnectedWorldSlotIndex?: number;
  initialBallWheelId?: string;
  initialBallWheelIds?: readonly string[];
  initialTopRotationStep?: number;
  initialBottomRotationStep?: number;
}>;

export type WheelTransferSnapshot = Readonly<{
  tick: number;
  ballId: string;
  blockingBallId: string;
  topWheelId: string;
  bottomWheelId: string;
  wheels: Readonly<Record<string, {
    id: string;
    slotCount: number;
    rotationStep: number;
    connectedWorldSlotIndex: number;
    ballLocalSlotIndex: number | null;
    slots: readonly (BallState | null)[];
    slotBallIds: readonly (string | null)[];
  }>>;
  lastEvents: readonly WheelTransferEvent[];
}>;

export type WheelTransferWorld = {
  tick: number;
  ballId: string;
  blockingBallId: string;
  topWheelId: string;
  bottomWheelId: string;
  connectedWorldSlots: Record<string, number>;
  wheels: Record<string, MutableWheelState>;
  lastEvents: WheelTransferEvent[];
};

export function createWheelTransferWorld(
  config: WheelTransferConfig
): WheelTransferWorld {
  if (!Number.isInteger(config.wheelSlotCount) || config.wheelSlotCount <= 0) {
    throw new Error("wheelSlotCount must be a positive integer.");
  }

  const topWheel = createWheelState({
    id: config.topWheelId,
    slotCount: config.wheelSlotCount,
    initialRotationStep: config.initialTopRotationStep
  });
  const bottomWheel = createWheelState({
    id: config.bottomWheelId,
    slotCount: config.wheelSlotCount,
    initialRotationStep: config.initialBottomRotationStep
  });
  const initialBallWheelId = config.initialBallWheelId ?? config.topWheelId;
  const initialBallWheelIds = config.initialBallWheelIds ?? [initialBallWheelId];
  const connectedWorldSlots = {
    [config.topWheelId]: config.topConnectedWorldSlotIndex ?? 4,
    [config.bottomWheelId]: config.bottomConnectedWorldSlotIndex ?? 0
  };
  const wheels = {
    [config.topWheelId]: topWheel,
    [config.bottomWheelId]: bottomWheel
  };
  for (const wheelId of initialBallWheelIds) {
    const initialWheel = wheels[wheelId];

    if (!initialWheel) {
      throw new Error(`Unknown initial ball wheel "${wheelId}".`);
    }

    setWheelWorldSlotOccupant(
      initialWheel,
      connectedWorldSlots[wheelId],
      wheelId === config.topWheelId ? TRANSFER_BALL_ID : BLOCKING_BALL_ID
    );
  }

  return {
    tick: 0,
    ballId: TRANSFER_BALL_ID,
    blockingBallId: BLOCKING_BALL_ID,
    topWheelId: config.topWheelId,
    bottomWheelId: config.bottomWheelId,
    connectedWorldSlots,
    wheels,
    lastEvents: []
  };
}

export function transferBallFromWheel(
  world: WheelTransferWorld,
  sourceWheelId: string
): readonly WheelTransferEvent[] {
  const sourceWheel = world.wheels[sourceWheelId];
  const targetWheelId = getOtherWheelId(world, sourceWheelId);

  if (!sourceWheel || !targetWheelId) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  const targetWheel = world.wheels[targetWheelId];
  const sourceWorldSlot = world.connectedWorldSlots[sourceWheelId];
  const targetWorldSlot = world.connectedWorldSlots[targetWheelId];
  const sourceLocalSlotIndex = worldToLocalSlot(
    sourceWorldSlot,
    sourceWheel.rotationStep,
    sourceWheel.slotCount
  );
  const targetLocalSlotIndex = worldToLocalSlot(
    targetWorldSlot,
    targetWheel.rotationStep,
    targetWheel.slotCount
  );

  const sourceBallId = getWheelWorldSlotOccupant(sourceWheel, sourceWorldSlot);

  if (sourceBallId === null) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  world.tick += 1;
  if (getWheelWorldSlotOccupant(targetWheel, targetWorldSlot) !== null) {
    world.lastEvents = [
      {
        type: "BALL_BOUNCED",
        ballId: sourceBallId,
        fromWheelId: sourceWheelId,
        toWheelId: targetWheelId,
        sourceLocalSlotIndex,
        targetLocalSlotIndex,
        tick: world.tick
      }
    ];
    return world.lastEvents;
  }

  setWheelWorldSlotOccupant(sourceWheel, sourceWorldSlot, null);
  setWheelWorldSlotOccupant(targetWheel, targetWorldSlot, sourceBallId);
  world.lastEvents = [
    {
      type: "BALL_TRANSFERRED",
      ballId: sourceBallId,
      fromWheelId: sourceWheelId,
      toWheelId: targetWheelId,
      sourceLocalSlotIndex,
      targetLocalSlotIndex,
      tick: world.tick
    }
  ];

  return world.lastEvents;
}

export function rotateTransferWheelClockwise(
  world: WheelTransferWorld,
  wheelId: string,
  steps = 1
): readonly WheelTransferEvent[] {
  const wheel = world.wheels[wheelId];

  if (!wheel) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  world.tick += 1;
  rotateWheelState(wheel, steps);
  world.lastEvents = [
    {
      type: "WHEEL_ROTATED",
      wheelId,
      steps,
      rotationStep: wheel.rotationStep,
      tick: world.tick
    }
  ];

  return world.lastEvents;
}

export function getWheelTransferSnapshot(
  world: WheelTransferWorld
): WheelTransferSnapshot {
  const wheels = Object.fromEntries(
    Object.entries(world.wheels).map(([wheelId, wheel]) => {
      const slotBallIds = getWheelSlotsSnapshot(wheel);
      const slots = slotBallIds.map((ballId) => getBallSnapshot(ballId));
      const ballLocalSlotIndex = slotBallIds.findIndex((slotOccupantId) => slotOccupantId !== null);

      return [
        wheelId,
        {
          id: wheel.id,
          slotCount: wheel.slotCount,
          rotationStep: wheel.rotationStep,
          connectedWorldSlotIndex: world.connectedWorldSlots[wheelId],
          ballLocalSlotIndex: ballLocalSlotIndex >= 0 ? ballLocalSlotIndex : null,
          slots,
          slotBallIds
        }
      ];
    })
  ) as WheelTransferSnapshot["wheels"];

  return {
    tick: world.tick,
    ballId: world.ballId,
    blockingBallId: world.blockingBallId,
    topWheelId: world.topWheelId,
    bottomWheelId: world.bottomWheelId,
    wheels,
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}

function getBallSnapshot(ballId: string | null): BallState | null {
  if (ballId === TRANSFER_BALL_ID) {
    return { ...TRANSFER_BALL };
  }

  if (ballId === BLOCKING_BALL_ID) {
    return { ...BLOCKING_BALL };
  }

  return null;
}

function getOtherWheelId(
  world: WheelTransferWorld,
  sourceWheelId: string
): string | null {
  if (sourceWheelId === world.topWheelId) {
    return world.bottomWheelId;
  }

  if (sourceWheelId === world.bottomWheelId) {
    return world.topWheelId;
  }

  return null;
}
