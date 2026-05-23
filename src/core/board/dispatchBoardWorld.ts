import type { BallColor, BallId, BallSeed, BallState } from "../ball/ballState";
import {
  createWheelState,
  getWheelSlotsSnapshot,
  getWheelWorldSlotOccupant,
  mod,
  rotateWheelState,
  setWheelWorldSlotOccupant,
  type MutableWheelState
} from "../wheel/wheelState";

export type DispatchBoardEvent =
  | Readonly<{
      type: "BALL_DISPATCHED";
      dispatcherId: string;
      slideId: string;
      ballId: BallId;
      color: BallColor;
      tick: number;
      timeMs: number;
    }>
  | Readonly<{
      type: "BALL_LANDED_IN_WHEEL";
      slideId: string;
      wheelId: string;
      ballId: BallId;
      color: BallColor;
      localSlotIndex: number;
      tick: number;
      timeMs: number;
    }>
  | Readonly<{
      type: "DISPATCHER_REFILLED";
      dispatcherId: string;
      ballId: BallId;
      color: BallColor;
      tick: number;
      timeMs: number;
    }>
  | Readonly<{
      type: "WHEEL_ROTATED";
      wheelId: string;
      steps: number;
      rotationStep: number;
      tick: number;
      timeMs: number;
    }>;

export type DispatchBoardConfig = Readonly<{
  dispatcherId?: string;
  slideId?: string;
  dispatchers?: readonly DispatchBoardDispatcherConfig[];
  wheelId: string;
  wheelSlotCount: number;
  dispatcherHasInitialBall?: boolean;
  initialRotationStep?: number;
  connectedLocalSlotIndex?: number;
  initialBall?: BallSeed;
  refillQueue?: readonly DispatchBoardQueuedBallConfig[];
}>;

export type DispatchBoardQueuedBallConfig = BallSeed &
  Readonly<{
    delayMs: number;
  }>;

export type DispatchBoardDispatcherConfig = Readonly<{
  id: string;
  slideId: string;
  hasInitialBall?: boolean;
  initialBall?: BallSeed;
  refillQueue?: readonly DispatchBoardQueuedBallConfig[];
  connectedWorldSlotIndex?: number;
}>;

export type DispatchBoardBallSnapshot = BallState;

export type DispatchBoardSnapshot = Readonly<{
  tick: number;
  timeMs: number;
  balls: Readonly<Record<BallId, BallState>>;
  dispatcher: Readonly<{
    id: string;
    hasBall: boolean;
    ball: DispatchBoardBallSnapshot | null;
    refillReadyAtMs: number | null;
    queuedBalls: readonly DispatchBoardBallSnapshot[];
  }>;
  dispatchers: readonly Readonly<{
    id: string;
    slideId: string;
    hasBall: boolean;
    ball: DispatchBoardBallSnapshot | null;
    refillReadyAtMs: number | null;
    queuedBalls: readonly DispatchBoardBallSnapshot[];
    connectedWorldSlotIndex: number;
  }>[];
  slide: Readonly<{
    id: string;
  }>;
  wheel: Readonly<{
    id: string;
    slotCount: number;
    rotationStep: number;
    ballLocalSlotIndex: number | null;
    slots: readonly (DispatchBoardBallSnapshot | null)[];
    slotBallIds: readonly (BallId | null)[];
  }>;
  lastEvents: readonly DispatchBoardEvent[];
}>;

type DispatchBoardQueuedBall = Readonly<{
  ballId: BallId;
  delayMs: number;
}>;

type DispatchBoardDispatcherState = {
  id: string;
  slideId: string;
  heldBallId: BallId | null;
  refillReadyAtMs: number | null;
  queue: DispatchBoardQueuedBall[];
  connectedWorldSlotIndex: number;
};

export type DispatchBoardWorld = {
  tick: number;
  timeMs: number;
  balls: Record<BallId, BallState>;
  dispatchers: Map<string, DispatchBoardDispatcherState>;
  primaryDispatcherId: string;
  wheel: MutableWheelState;
  lastEvents: DispatchBoardEvent[];
};

export function createDispatchBoardWorld(
  config: DispatchBoardConfig
): DispatchBoardWorld {
  if (!Number.isInteger(config.wheelSlotCount) || config.wheelSlotCount <= 0) {
    throw new Error("wheelSlotCount must be a positive integer.");
  }

  const dispatcherConfigs = config.dispatchers ?? [
    {
      id: config.dispatcherId ?? "dispatcher",
      slideId: config.slideId ?? "slide",
      hasInitialBall: config.dispatcherHasInitialBall ?? true,
      initialBall: config.initialBall,
      refillQueue: config.refillQueue,
      connectedWorldSlotIndex: config.connectedLocalSlotIndex ?? 0
    }
  ];

  if (dispatcherConfigs.length === 0) {
    throw new Error("Dispatch board must have at least one dispatcher.");
  }

  const balls: Record<BallId, BallState> = {};
  const dispatchers = new Map<string, DispatchBoardDispatcherState>();

  for (const dispatcherConfig of dispatcherConfigs) {
    if (dispatchers.has(dispatcherConfig.id)) {
      throw new Error(`Duplicate dispatcher "${dispatcherConfig.id}".`);
    }

    const heldBall = createInitialBall(dispatcherConfig);
    const queue = (dispatcherConfig.refillQueue ?? []).map((queuedBall, index) => {
      assertNonNegativeDelay(queuedBall.delayMs, dispatcherConfig.id);
      const ball = createBallFromSeed(
        queuedBall,
        `${dispatcherConfig.id}:ball-${index + 2}`
      );
      registerBall(balls, ball);

      return {
        ballId: ball.id,
        delayMs: queuedBall.delayMs
      };
    });

    if (heldBall) {
      registerBall(balls, heldBall);
    }

    dispatchers.set(dispatcherConfig.id, {
      id: dispatcherConfig.id,
      slideId: dispatcherConfig.slideId,
      heldBallId: heldBall?.id ?? null,
      refillReadyAtMs: null,
      queue,
      connectedWorldSlotIndex: mod(
        dispatcherConfig.connectedWorldSlotIndex ?? 0,
        config.wheelSlotCount
      )
    });
  }

  return {
    tick: 0,
    timeMs: 0,
    balls,
    dispatchers,
    primaryDispatcherId: dispatcherConfigs[0].id,
    wheel: createWheelState({
      id: config.wheelId,
      slotCount: config.wheelSlotCount,
      initialRotationStep: config.initialRotationStep
    }),
    lastEvents: []
  };
}

export function dispatchBall(
  world: DispatchBoardWorld,
  dispatcherId = world.primaryDispatcherId
): readonly DispatchBoardEvent[] {
  const dispatcher = world.dispatchers.get(dispatcherId);

  if (!dispatcher?.heldBallId) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  if (getWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex) !== null) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  const ball = world.balls[dispatcher.heldBallId];

  if (!ball) {
    throw new Error(`Unknown ball "${dispatcher.heldBallId}".`);
  }

  world.tick += 1;
  dispatcher.heldBallId = null;
  scheduleNextRefill(world, dispatcher);
  const localSlotIndex = setWheelWorldSlotOccupant(
    world.wheel,
    dispatcher.connectedWorldSlotIndex,
    ball.id
  );

  world.lastEvents = [
    {
      type: "BALL_DISPATCHED",
      dispatcherId: dispatcher.id,
      slideId: dispatcher.slideId,
      ballId: ball.id,
      color: ball.color,
      tick: world.tick,
      timeMs: world.timeMs
    },
    {
      type: "BALL_LANDED_IN_WHEEL",
      slideId: dispatcher.slideId,
      wheelId: world.wheel.id,
      ballId: ball.id,
      color: ball.color,
      localSlotIndex,
      tick: world.tick,
      timeMs: world.timeMs
    }
  ];

  return world.lastEvents;
}

export function advanceDispatchBoardTime(
  world: DispatchBoardWorld,
  deltaMs: number
): readonly DispatchBoardEvent[] {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("deltaMs must be a non-negative finite number.");
  }

  if (deltaMs === 0) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  world.timeMs += deltaMs;
  const events: DispatchBoardEvent[] = [];

  for (const dispatcher of world.dispatchers.values()) {
    if (
      dispatcher.heldBallId !== null ||
      dispatcher.refillReadyAtMs === null ||
      world.timeMs < dispatcher.refillReadyAtMs
    ) {
      continue;
    }

    const queuedBall = dispatcher.queue.shift();
    dispatcher.refillReadyAtMs = null;

    if (!queuedBall) {
      continue;
    }

    dispatcher.heldBallId = queuedBall.ballId;
    const ball = world.balls[queuedBall.ballId];

    if (!ball) {
      throw new Error(`Unknown queued ball "${queuedBall.ballId}".`);
    }

    world.tick += 1;
    events.push({
      type: "DISPATCHER_REFILLED",
      dispatcherId: dispatcher.id,
      ballId: ball.id,
      color: ball.color,
      tick: world.tick,
      timeMs: world.timeMs
    });
  }

  world.lastEvents = events;
  return world.lastEvents;
}

export function rotateWheelClockwise(
  world: DispatchBoardWorld,
  steps = 1
): readonly DispatchBoardEvent[] {
  world.tick += 1;
  rotateWheelState(world.wheel, steps);
  world.lastEvents = [
    {
      type: "WHEEL_ROTATED",
      wheelId: world.wheel.id,
      steps,
      rotationStep: world.wheel.rotationStep,
      tick: world.tick,
      timeMs: world.timeMs
    }
  ];

  return world.lastEvents;
}

export function getDispatchBoardSnapshot(
  world: DispatchBoardWorld
): DispatchBoardSnapshot {
  const dispatchers = [...world.dispatchers.values()].map((dispatcher) => ({
    id: dispatcher.id,
    slideId: dispatcher.slideId,
    hasBall: dispatcher.heldBallId !== null,
    ball: getBallSnapshot(world, dispatcher.heldBallId),
    refillReadyAtMs: dispatcher.refillReadyAtMs,
    queuedBalls: dispatcher.queue.map((queuedBall) =>
      getRequiredBallSnapshot(world, queuedBall.ballId)
    ),
    connectedWorldSlotIndex: dispatcher.connectedWorldSlotIndex
  }));
  const primaryDispatcher =
    world.dispatchers.get(world.primaryDispatcherId) ?? [...world.dispatchers.values()][0];
  const slotBallIds = getWheelSlotsSnapshot(world.wheel);
  const slots = slotBallIds.map((ballId) => getBallSnapshot(world, ballId));
  const firstOccupiedLocalSlotIndex = slotBallIds.findIndex(
    (slotOccupantId) => slotOccupantId !== null
  );

  return {
    tick: world.tick,
    timeMs: world.timeMs,
    balls: { ...world.balls },
    dispatcher: {
      id: primaryDispatcher.id,
      hasBall: primaryDispatcher.heldBallId !== null,
      ball: getBallSnapshot(world, primaryDispatcher.heldBallId),
      refillReadyAtMs: primaryDispatcher.refillReadyAtMs,
      queuedBalls: primaryDispatcher.queue.map((queuedBall) =>
        getRequiredBallSnapshot(world, queuedBall.ballId)
      )
    },
    dispatchers,
    slide: {
      id: primaryDispatcher.slideId
    },
    wheel: {
      id: world.wheel.id,
      slotCount: world.wheel.slotCount,
      rotationStep: world.wheel.rotationStep,
      ballLocalSlotIndex: firstOccupiedLocalSlotIndex >= 0 ? firstOccupiedLocalSlotIndex : null,
      slots,
      slotBallIds
    },
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}

function createInitialBall(
  dispatcherConfig: DispatchBoardDispatcherConfig
): BallState | null {
  if (dispatcherConfig.initialBall) {
    return createBallFromSeed(
      dispatcherConfig.initialBall,
      `${dispatcherConfig.id}:ball`
    );
  }

  if (dispatcherConfig.hasInitialBall === false) {
    return null;
  }

  return {
    id: `${dispatcherConfig.id}:ball`,
    color: "red"
  };
}

function createBallFromSeed(seed: BallSeed, fallbackId: BallId): BallState {
  return {
    id: seed.id ?? fallbackId,
    color: seed.color
  };
}

function registerBall(balls: Record<BallId, BallState>, ball: BallState): void {
  if (balls[ball.id]) {
    throw new Error(`Duplicate ball "${ball.id}".`);
  }

  balls[ball.id] = ball;
}

function scheduleNextRefill(
  world: DispatchBoardWorld,
  dispatcher: DispatchBoardDispatcherState
): void {
  const nextBall = dispatcher.queue[0];
  dispatcher.refillReadyAtMs = nextBall ? world.timeMs + nextBall.delayMs : null;
}

function assertNonNegativeDelay(delayMs: number, dispatcherId: string): void {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error(`Dispatcher "${dispatcherId}" refill delay must be non-negative.`);
  }
}

function getBallSnapshot(
  world: DispatchBoardWorld,
  ballId: BallId | null
): BallState | null {
  if (!ballId) {
    return null;
  }

  return getRequiredBallSnapshot(world, ballId);
}

function getRequiredBallSnapshot(
  world: DispatchBoardWorld,
  ballId: BallId
): BallState {
  const ball = world.balls[ballId];

  if (!ball) {
    throw new Error(`Unknown ball "${ballId}".`);
  }

  return { ...ball };
}
