import {
  createWheelState,
  getWheelSlotsSnapshot,
  rotateWheelState,
  type MutableWheelState,
  type WheelConfig,
  type WheelId,
  type WheelState
} from "./wheelState";

export type RotateWheelCommand = Readonly<{
  type: "ROTATE_WHEEL";
  wheelId: WheelId;
  steps: number;
}>;

export type WheelRotatedEvent = Readonly<{
  type: "WHEEL_ROTATED";
  wheelId: WheelId;
  steps: number;
  rotationStep: number;
  tick: number;
}>;

export type WheelEvent = WheelRotatedEvent;

export type WheelWorldSnapshot = Readonly<{
  tick: number;
  pendingCommands: number;
  wheels: Readonly<Record<WheelId, WheelState>>;
  lastEvents: readonly WheelEvent[];
}>;

export type WheelWorld = {
  tick: number;
  commandQueue: RotateWheelCommand[];
  lastEvents: WheelEvent[];
  wheels: Record<WheelId, MutableWheelState>;
};

export function createWheelWorld(configs: readonly WheelConfig[]): WheelWorld {
  const wheels: Record<WheelId, MutableWheelState> = {};

  for (const config of configs) {
    wheels[config.id] = createWheelState(config);
  }

  return {
    tick: 0,
    commandQueue: [],
    lastEvents: [],
    wheels
  };
}

export function enqueueRotateWheel(
  world: WheelWorld,
  wheelId: WheelId,
  steps = 1
): void {
  if (!Number.isInteger(steps) || steps === 0) {
    throw new Error("Rotate steps must be a non-zero integer.");
  }

  if (!world.wheels[wheelId]) {
    throw new Error(`Unknown wheel "${wheelId}".`);
  }

  world.commandQueue.push({
    type: "ROTATE_WHEEL",
    wheelId,
    steps
  });
}

export function tickWheelWorld(world: WheelWorld): readonly WheelEvent[] {
  world.tick += 1;

  const commands = world.commandQueue.splice(0, world.commandQueue.length);
  const events: WheelEvent[] = [];

  for (const command of commands) {
    const wheel = world.wheels[command.wheelId];

    if (!wheel) {
      throw new Error(`Unknown wheel "${command.wheelId}".`);
    }

    rotateWheelState(wheel, command.steps);
    events.push({
      type: "WHEEL_ROTATED",
      wheelId: wheel.id,
      steps: command.steps,
      rotationStep: wheel.rotationStep,
      tick: world.tick
    });
  }

  world.lastEvents = events;
  return events;
}

export function getWheelWorldSnapshot(world: WheelWorld): WheelWorldSnapshot {
  const wheels = Object.fromEntries(
    Object.entries(world.wheels).map(([wheelId, wheel]) => [
      wheelId,
      {
        id: wheel.id,
        slotCount: wheel.slotCount,
        rotationStep: wheel.rotationStep,
        slots: getWheelSlotsSnapshot(wheel)
      }
    ])
  ) as Record<WheelId, WheelState>;

  return {
    tick: world.tick,
    pendingCommands: world.commandQueue.length,
    wheels,
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}

export type { WheelConfig, WheelId, WheelState } from "./wheelState";
