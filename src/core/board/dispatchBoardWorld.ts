import {
  createWheelState,
  getWheelSlotsSnapshot,
  getWheelWorldSlotOccupant,
  mod,
  rotateWheelState,
  setWheelWorldSlotOccupant,
  type MutableWheelState
} from "../wheel/wheelState";

function toDispatcherBallId(dispatcherId: string): string {
  return `${dispatcherId}:ball`;
}

export type DispatchBoardEvent =
  | Readonly<{
      type: "BALL_DISPATCHED";
      dispatcherId: string;
      slideId: string;
      tick: number;
    }>
  | Readonly<{
      type: "BALL_LANDED_IN_WHEEL";
      slideId: string;
      wheelId: string;
      localSlotIndex: number;
      tick: number;
    }>
  | Readonly<{
      type: "WHEEL_ROTATED";
      wheelId: string;
      steps: number;
      rotationStep: number;
      tick: number;
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
}>;

export type DispatchBoardDispatcherConfig = Readonly<{
  id: string;
  slideId: string;
  hasInitialBall?: boolean;
  connectedWorldSlotIndex?: number;
}>;

export type DispatchBoardSnapshot = Readonly<{
  tick: number;
  dispatcher: Readonly<{
    id: string;
    hasBall: boolean;
  }>;
  dispatchers: readonly Readonly<{
    id: string;
    slideId: string;
    hasBall: boolean;
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
    slots: readonly (string | null)[];
  }>;
  lastEvents: readonly DispatchBoardEvent[];
}>;

export type DispatchBoardWorld = {
  tick: number;
  dispatchers: Map<string, {
    id: string;
    slideId: string;
    hasBall: boolean;
    connectedWorldSlotIndex: number;
  }>;
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
      connectedWorldSlotIndex: config.connectedLocalSlotIndex ?? 0
    }
  ];

  if (dispatcherConfigs.length === 0) {
    throw new Error("Dispatch board must have at least one dispatcher.");
  }

  const dispatchers = new Map<string, {
    id: string;
    slideId: string;
    hasBall: boolean;
    connectedWorldSlotIndex: number;
  }>();

  for (const dispatcherConfig of dispatcherConfigs) {
    if (dispatchers.has(dispatcherConfig.id)) {
      throw new Error(`Duplicate dispatcher "${dispatcherConfig.id}".`);
    }

    dispatchers.set(dispatcherConfig.id, {
      id: dispatcherConfig.id,
      slideId: dispatcherConfig.slideId,
      hasBall: dispatcherConfig.hasInitialBall ?? true,
      connectedWorldSlotIndex: mod(
        dispatcherConfig.connectedWorldSlotIndex ?? 0,
        config.wheelSlotCount
      )
    });
  }

  return {
    tick: 0,
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

  if (!dispatcher) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  if (
    !dispatcher.hasBall ||
    getWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex) !== null
  ) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  world.tick += 1;
  dispatcher.hasBall = false;
  const localSlotIndex = setWheelWorldSlotOccupant(
    world.wheel,
    dispatcher.connectedWorldSlotIndex,
    toDispatcherBallId(dispatcher.id)
  );

  world.lastEvents = [
    {
      type: "BALL_DISPATCHED",
      dispatcherId: dispatcher.id,
      slideId: dispatcher.slideId,
      tick: world.tick
    },
    {
      type: "BALL_LANDED_IN_WHEEL",
      slideId: dispatcher.slideId,
      wheelId: world.wheel.id,
      localSlotIndex,
      tick: world.tick
    }
  ];

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
      tick: world.tick
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
    hasBall: dispatcher.hasBall,
    connectedWorldSlotIndex: dispatcher.connectedWorldSlotIndex
  }));
  const primaryDispatcher = world.dispatchers.get(world.primaryDispatcherId) ?? dispatchers[0];
  const firstOccupiedLocalSlotIndex = world.wheel.slots.findIndex(
    (slotOccupantId) => slotOccupantId !== null
  );

  return {
    tick: world.tick,
    dispatcher: {
      id: primaryDispatcher.id,
      hasBall: primaryDispatcher.hasBall
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
      slots: getWheelSlotsSnapshot(world.wheel)
    },
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}
