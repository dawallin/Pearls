import {
  createWheelState,
  findWheelOccupantLocalSlotIndex,
  getWheelSlotsSnapshot,
  getWheelWorldSlotOccupant,
  mod,
  rotateWheelState,
  setWheelWorldSlotOccupant,
  type MutableWheelState
} from "../wheel/wheelState";

const DISPATCHER_BALL_ID = "dispatcher-ball";

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
  dispatcherId: string;
  slideId: string;
  wheelId: string;
  wheelSlotCount: number;
  dispatcherHasInitialBall?: boolean;
  initialRotationStep?: number;
  connectedLocalSlotIndex?: number;
}>;

export type DispatchBoardSnapshot = Readonly<{
  tick: number;
  dispatcher: Readonly<{
    id: string;
    hasBall: boolean;
  }>;
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
  dispatcher: {
    id: string;
    hasBall: boolean;
  };
  slide: {
    id: string;
  };
  wheel: MutableWheelState;
  lastEvents: DispatchBoardEvent[];
  connectedWorldSlotIndex: number;
};

export function createDispatchBoardWorld(
  config: DispatchBoardConfig
): DispatchBoardWorld {
  if (!Number.isInteger(config.wheelSlotCount) || config.wheelSlotCount <= 0) {
    throw new Error("wheelSlotCount must be a positive integer.");
  }

  const connectedWorldSlotIndex = mod(
    config.connectedLocalSlotIndex ?? 0,
    config.wheelSlotCount
  );

  return {
    tick: 0,
    dispatcher: {
      id: config.dispatcherId,
      hasBall: config.dispatcherHasInitialBall ?? true
    },
    slide: {
      id: config.slideId
    },
    wheel: createWheelState({
      id: config.wheelId,
      slotCount: config.wheelSlotCount,
      initialRotationStep: config.initialRotationStep
    }),
    lastEvents: [],
    connectedWorldSlotIndex
  };
}

export function dispatchBall(
  world: DispatchBoardWorld
): readonly DispatchBoardEvent[] {
  if (
    !world.dispatcher.hasBall ||
    getWheelWorldSlotOccupant(world.wheel, world.connectedWorldSlotIndex) !== null
  ) {
    world.lastEvents = [];
    return world.lastEvents;
  }

  world.tick += 1;
  world.dispatcher.hasBall = false;
  const localSlotIndex = setWheelWorldSlotOccupant(
    world.wheel,
    world.connectedWorldSlotIndex,
    DISPATCHER_BALL_ID
  );

  world.lastEvents = [
    {
      type: "BALL_DISPATCHED",
      dispatcherId: world.dispatcher.id,
      slideId: world.slide.id,
      tick: world.tick
    },
    {
      type: "BALL_LANDED_IN_WHEEL",
      slideId: world.slide.id,
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
  return {
    tick: world.tick,
    dispatcher: {
      id: world.dispatcher.id,
      hasBall: world.dispatcher.hasBall
    },
    slide: {
      id: world.slide.id
    },
    wheel: {
      id: world.wheel.id,
      slotCount: world.wheel.slotCount,
      rotationStep: world.wheel.rotationStep,
      ballLocalSlotIndex: findWheelOccupantLocalSlotIndex(world.wheel, DISPATCHER_BALL_ID),
      slots: getWheelSlotsSnapshot(world.wheel)
    },
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}
