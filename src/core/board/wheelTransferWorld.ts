import type { BallState } from "../ball/ballState";
import { PEARL_DIAMETER_GRID_UNITS, REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS } from "../geometry/physicalGeometry";
import type { GridLevelDefinition } from "../level/gridLevel";
import {
  buildVerticalComponentTransitRoute,
  type ComponentTransitSegment
} from "./componentTransitRoute";
import type { ComponentTransitEdge, ComponentTransitState } from "./componentTransitState";
import { advanceComponentTransits } from "./componentTransitSystem";
import {
  createComponentConnectionState,
  isComponentConnectionAllowed,
  resolveComponentConnection,
  setComponentConnection,
  type ComponentConnectionDefinition,
  type ComponentConnectionEndpoint,
  type ComponentConnectionOption,
  type ComponentConnectionState,
  type ComponentTerminalPort
} from "./componentConnectionState";
import {
  createWheelState,
  getWheelSlotsSnapshot,
  getWheelWorldSlotOccupant,
  rotateWheelState,
  setWheelWorldSlotOccupant,
  worldToLocalSlot,
  type MutableWheelState
} from "../wheel/wheelState";

export const WHEEL_TRANSFER_FIXED_TICK_MS = 16;
export const WHEEL_TRANSFER_TRAVEL_MS = 520;
export const WHEEL_TRANSFER_REFERENCE_ROUTE_LENGTH_GRID_UNITS = REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS;
export const PEARL_TRANSIT_SPEED_GRID_UNITS_PER_MS = WHEEL_TRANSFER_REFERENCE_ROUTE_LENGTH_GRID_UNITS / WHEEL_TRANSFER_TRAVEL_MS;

const TRANSFER_BALL: BallState = { id: "transfer-ball", color: "red" };
const BLOCKING_BALL: BallState = { id: "blocking-ball", color: "red" };
const DEBUG_EVENT_HISTORY_LIMIT = 64;

export type TransitDirection = "forward" | "back";
export type WheelTransferConnectionEndpoint = Exclude<ComponentConnectionEndpoint, Readonly<{ kind: "dispatcher" }>>;
export type ComponentContact = Readonly<{ componentId: string; localProgress: number }>;
export type WheelTransferEvent =
  | Readonly<{ type: "BALL_LAUNCHED"; ballId: string; color: BallState["color"]; fromWheelId: string; adjacentComponentId: string; entryEdge: ComponentTransitEdge; pathId: string; tick: number }>
  | Readonly<{ type: "SEGMENT_HANDOFF"; ballId: string; pathId: string; fromSegmentId: string; toSegmentId: string; tick: number }>
  | Readonly<{ type: "BALL_COLLIDED"; ballIds: readonly [string, string]; pathId: string; segmentId: string; contacts: readonly [ComponentContact, ComponentContact]; tick: number }>
  | Readonly<{ type: "BALL_LANDED"; ballId: string; wheelId: string; localSlotIndex: number; tick: number }>
  | Readonly<{ type: "BALL_TRANSFERRED"; ballId: string; fromWheelId: string; toWheelId: string; sourceLocalSlotIndex: number; targetLocalSlotIndex: number; tick: number }>
  | Readonly<{ type: "BALL_BOUNCED"; ballId: string; fromWheelId: string; toWheelId: string; sourceLocalSlotIndex: number; targetLocalSlotIndex: number; segmentId: string; localProgress: number; tick: number }>
  | Readonly<{ type: "WHEEL_ROTATED"; wheelId: string; steps: number; rotationStep: number; tick: number }>;

export type WheelTransferLaunchRequest = Readonly<{
  ballId: string;
  fromWheelId: string;
  adjacentComponentId: string;
  entryEdge: ComponentTransitEdge;
  sourceLocalSlotIndex: number;
}>;
export type WheelTransferRotationRequest = Readonly<{ wheelId: string; steps: number; rotationStep: number }>;
export type WheelTransferTransitSnapshot = Readonly<{
  ball: BallState;
  pathId: string;
  fromWheelId: string;
  currentSegmentId: string;
  currentComponentId: string;
  segment: ComponentTransitSegment;
  entryEdge: ComponentTransitEdge;
  previousEdge: ComponentTransitEdge;
  localProgress: number;
  direction: TransitDirection;
  endpointIntent: WheelTransferConnectionEndpoint;
}>;
export type WheelTransferConfig = Readonly<{
  level: GridLevelDefinition;
  topWheelId: string;
  bottomWheelId: string;
  wheelSlotCount: number;
  topConnectedWorldSlotIndex: number;
  bottomConnectedWorldSlotIndex: number;
  initialBallWheelId?: string;
  initialBallWheelIds?: readonly string[];
  initialBalls?: readonly Readonly<{ wheelId: string; ball: BallState }>[];
  initialTopRotationStep?: number;
  initialBottomRotationStep?: number;
  connectionOptions?: readonly ComponentConnectionOption[];
}>;
export type WheelTransferSnapshot = Readonly<{
  tick: number;
  ballId: string;
  blockingBallId: string;
  topWheelId: string;
  bottomWheelId: string;
  pathId: string;
  components: readonly ComponentTransitSegment[];
  pendingLaunchCount: number;
  wheels: Readonly<Record<string, {
    id: string;
    slotCount: number;
    rotationStep: number;
    connectedWorldSlotIndex: number;
    ballLocalSlotIndex: number | null;
    slots: readonly (BallState | null)[];
    slotBallIds: readonly (string | null)[];
  }>>;
  activeTransits: readonly WheelTransferTransitSnapshot[];
  lastEvents: readonly WheelTransferEvent[];
}>;

type ActiveTransit = ComponentTransitState & {
  ball: BallState;
  fromWheelId: string;
  direction: TransitDirection;
};
type WheelAttachment = Readonly<{
  componentId: string;
  entryEdge: ComponentTransitEdge;
  direction: TransitDirection;
}>;
type WheelTransferCommand =
  | Readonly<{ type: "LAUNCH_FROM_WHEEL"; sourceWheelId: string; ballId: string }>
  | Readonly<{ type: "ROTATE_WHEEL"; wheelId: string; steps: number }>
  | Readonly<{ type: "SET_CONNECTION"; componentId: string; exitEdge: ComponentTransitEdge; endpoint: WheelTransferConnectionEndpoint }>;

export type WheelTransferWorld = {
  tick: number;
  ballId: string;
  blockingBallId: string;
  topWheelId: string;
  bottomWheelId: string;
  pathId: string;
  components: readonly ComponentTransitSegment[];
  componentCatalog: Map<string, ComponentTransitSegment>;
  wheelAttachments: Record<string, WheelAttachment>;
  connectedWorldSlots: Record<string, number>;
  wheels: Record<string, MutableWheelState>;
  balls: Record<string, BallState>;
  activeTransits: Map<string, ActiveTransit>;
  pendingLaunchBallIds: Set<string>;
  pendingCommands: WheelTransferCommand[];
  connectionState: ComponentConnectionState;
  lastEvents: WheelTransferEvent[];
};

export function createWheelTransferWorld(config: WheelTransferConfig): WheelTransferWorld {
  if (!Number.isInteger(config.wheelSlotCount) || config.wheelSlotCount <= 0) throw new Error("wheelSlotCount must be a positive integer.");
  assertConnectedWorldSlot(config.topConnectedWorldSlotIndex, config.wheelSlotCount, "top");
  assertConnectedWorldSlot(config.bottomConnectedWorldSlotIndex, config.wheelSlotCount, "bottom");
  const topology = buildVerticalComponentTransitRoute(config.level, config.topWheelId, config.bottomWheelId);
  const components = topology.segments;
  const componentCatalog = new Map(components.map((component) => [component.componentId, component]));
  const wheels = {
    [config.topWheelId]: createWheelState({ id: config.topWheelId, slotCount: config.wheelSlotCount, initialRotationStep: config.initialTopRotationStep }),
    [config.bottomWheelId]: createWheelState({ id: config.bottomWheelId, slotCount: config.wheelSlotCount, initialRotationStep: config.initialBottomRotationStep })
  };
  const connections = createDefaultConnections(components, config.topWheelId, config.bottomWheelId);
  validateConnectionOptions(config.connectionOptions ?? [], components, config.topWheelId, config.bottomWheelId);
  const world: WheelTransferWorld = {
    tick: 0,
    ballId: TRANSFER_BALL.id,
    blockingBallId: BLOCKING_BALL.id,
    topWheelId: config.topWheelId,
    bottomWheelId: config.bottomWheelId,
    pathId: topology.id,
    components,
    componentCatalog,
    wheelAttachments: {
      [config.topWheelId]: { componentId: components[0].componentId, entryEdge: components[0].entryEdge, direction: "forward" },
      [config.bottomWheelId]: { componentId: components.at(-1)!.componentId, entryEdge: components.at(-1)!.exitEdge, direction: "back" }
    },
    connectedWorldSlots: {
      [config.topWheelId]: config.topConnectedWorldSlotIndex,
      [config.bottomWheelId]: config.bottomConnectedWorldSlotIndex
    },
    wheels,
    balls: {},
    activeTransits: new Map(),
    pendingLaunchBallIds: new Set(),
    pendingCommands: [],
    connectionState: createComponentConnectionState(connections, config.connectionOptions, components, createTerminalPorts(components, config.topWheelId, config.bottomWheelId)),
    lastEvents: []
  };
  const legacyWheelIds = config.initialBallWheelIds ?? [config.initialBallWheelId ?? config.topWheelId];
  const seeds = config.initialBalls ?? legacyWheelIds.map((wheelId) => ({ wheelId, ball: wheelId === config.topWheelId ? TRANSFER_BALL : BLOCKING_BALL }));
  for (const { wheelId, ball } of seeds) {
    const wheel = world.wheels[wheelId];
    if (!wheel) throw new Error(`Unknown initial ball wheel "${wheelId}".`);
    if (world.balls[ball.id]) throw new Error(`Duplicate ball id "${ball.id}".`);
    world.balls[ball.id] = { ...ball };
    setWheelWorldSlotOccupant(wheel, world.connectedWorldSlots[wheelId], ball.id);
  }
  return world;
}

/** Queues the connection selected at the next fixed-tick boundary. */
export function setWheelTransferConnection(
  world: WheelTransferWorld,
  componentId: string,
  exitEdge: ComponentTransitEdge,
  endpoint: WheelTransferConnectionEndpoint
): void {
  if (!isComponentConnectionAllowed(world.connectionState, componentId, exitEdge, endpoint)) {
    throw new Error(`Endpoint is not a valid connection option for "${componentId}:${exitEdge}".`);
  }
  world.pendingCommands.push({ type: "SET_CONNECTION", componentId, exitEdge, endpoint: { ...endpoint } });
}

/** Queues a source-side launch. Eligibility depends only on the wheel's adjacent slide slot. */
export function transferBallFromWheel(world: WheelTransferWorld, sourceWheelId: string): WheelTransferLaunchRequest | null {
  const sourceWheel = world.wheels[sourceWheelId];
  if (!sourceWheel) return null;
  const ballId = getWheelWorldSlotOccupant(sourceWheel, world.connectedWorldSlots[sourceWheelId]);
  if (!ballId || world.activeTransits.has(ballId) || world.pendingLaunchBallIds.has(ballId)) return null;
  const ball = world.balls[ballId];
  if (!ball) return null;
  const attachment = world.wheelAttachments[sourceWheelId];
  world.pendingLaunchBallIds.add(ballId);
  world.pendingCommands.push({ type: "LAUNCH_FROM_WHEEL", sourceWheelId, ballId });
  return {
    ballId,
    fromWheelId: sourceWheelId,
    adjacentComponentId: attachment.componentId,
    entryEdge: attachment.entryEdge,
    sourceLocalSlotIndex: worldToLocalSlot(world.connectedWorldSlots[sourceWheelId], sourceWheel.rotationStep, sourceWheel.slotCount)
  };
}

export function advanceWheelTransferWorld(world: WheelTransferWorld, ticks = 1): readonly WheelTransferEvent[] {
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error("ticks must be a non-negative integer.");
  const batchStart = world.lastEvents.length;
  for (let step = 0; step < ticks; step += 1) {
    world.tick += 1;
    applyCommandsAtTickStart(world);
    advanceOneTick(world);
  }
  if (world.lastEvents.length > DEBUG_EVENT_HISTORY_LIMIT) {
    const removed = world.lastEvents.length - DEBUG_EVENT_HISTORY_LIMIT;
    world.lastEvents.splice(0, removed);
    return batchStart < removed ? world.lastEvents : world.lastEvents.slice(batchStart - removed);
  }
  return world.lastEvents.slice(batchStart);
}

export function rotateTransferWheelClockwise(world: WheelTransferWorld, wheelId: string, steps = 1): WheelTransferRotationRequest | null {
  const wheel = world.wheels[wheelId];
  if (!wheel || !Number.isInteger(steps) || steps === 0) return null;
  const queuedSteps = world.pendingCommands.reduce((sum, command) =>
    command.type === "ROTATE_WHEEL" && command.wheelId === wheelId ? sum + command.steps : sum, 0);
  const rotationStep = normalizeRotationStep(wheel.rotationStep + queuedSteps + steps, wheel.slotCount);
  world.pendingCommands.push({ type: "ROTATE_WHEEL", wheelId, steps });
  return { wheelId, steps, rotationStep };
}

export function getWheelTransferSnapshot(world: WheelTransferWorld): WheelTransferSnapshot {
  const wheels = Object.fromEntries(Object.entries(world.wheels).map(([wheelId, wheel]) => {
    const slotBallIds = getWheelSlotsSnapshot(wheel);
    const ballLocalSlotIndex = slotBallIds.findIndex((id) => id !== null);
    return [wheelId, {
      id: wheel.id,
      slotCount: wheel.slotCount,
      rotationStep: wheel.rotationStep,
      connectedWorldSlotIndex: world.connectedWorldSlots[wheelId],
      ballLocalSlotIndex: ballLocalSlotIndex < 0 ? null : ballLocalSlotIndex,
      slots: slotBallIds.map((id) => id ? { ...world.balls[id] } : null),
      slotBallIds
    }];
  })) as WheelTransferSnapshot["wheels"];
  const activeTransits = [...world.activeTransits.values()]
    .sort((a, b) => a.ball.id.localeCompare(b.ball.id))
    .map((transit): WheelTransferTransitSnapshot => {
      const segment = getComponent(world, transit.currentComponentId);
      return {
        ball: { ...transit.ball },
        pathId: world.pathId,
        fromWheelId: transit.fromWheelId,
        currentSegmentId: segment.id,
        currentComponentId: transit.currentComponentId,
        segment,
        entryEdge: transit.entryEdge,
        previousEdge: transit.previousEdge,
        localProgress: transit.localProgress,
        direction: transit.direction,
        endpointIntent: resolveConnection(world, transit)
      };
    });
  return {
    tick: world.tick,
    ballId: world.ballId,
    blockingBallId: world.blockingBallId,
    topWheelId: world.topWheelId,
    bottomWheelId: world.bottomWheelId,
    pathId: world.pathId,
    components: world.components,
    pendingLaunchCount: world.pendingLaunchBallIds.size,
    wheels,
    activeTransits,
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}

function applyCommandsAtTickStart(world: WheelTransferWorld): void {
  const commands = world.pendingCommands.splice(0);
  for (const command of commands) {
    if (command.type === "SET_CONNECTION") {
      setComponentConnection(world.connectionState, command.componentId, command.exitEdge, command.endpoint);
      continue;
    }
    if (command.type === "ROTATE_WHEEL") {
      const wheel = world.wheels[command.wheelId];
      if (!wheel) continue;
      rotateWheelState(wheel, command.steps);
      world.lastEvents.push({
        type: "WHEEL_ROTATED",
        wheelId: command.wheelId,
        steps: command.steps,
        rotationStep: wheel.rotationStep,
        tick: world.tick
      });
      continue;
    }

    world.pendingLaunchBallIds.delete(command.ballId);
    const sourceWheel = world.wheels[command.sourceWheelId];
    if (!sourceWheel) continue;
    if (getWheelWorldSlotOccupant(sourceWheel, world.connectedWorldSlots[command.sourceWheelId]) !== command.ballId) continue;
    const ball = world.balls[command.ballId];
    if (!ball || world.activeTransits.has(command.ballId)) continue;
    const attachment = world.wheelAttachments[command.sourceWheelId];
    const segment = getComponent(world, attachment.componentId);
    setWheelWorldSlotOccupant(sourceWheel, world.connectedWorldSlots[command.sourceWheelId], null);
    world.activeTransits.set(command.ballId, {
      ball,
      fromWheelId: command.sourceWheelId,
      currentComponentId: attachment.componentId,
      entryEdge: attachment.entryEdge,
      previousEdge: attachment.entryEdge,
      localProgress: attachment.direction === "forward" ? 0 : segment.length,
      direction: attachment.direction
    });
    world.lastEvents.push({
      type: "BALL_LAUNCHED",
      ballId: command.ballId,
      color: ball.color,
      fromWheelId: command.sourceWheelId,
      adjacentComponentId: attachment.componentId,
      entryEdge: attachment.entryEdge,
      pathId: world.pathId,
      tick: world.tick
    });
  }
}

function advanceOneTick(world: WheelTransferWorld): void {
  advanceComponentTransits({
    transits: () => [...world.activeTransits.values()],
    id: (transit) => transit.ball.id,
    getSegment: (id) => getComponent(world, id),
    connections: world.connectionState,
    speed: PEARL_TRANSIT_SPEED_GRID_UNITS_PER_MS,
    terminalClearance: (_transit, endpoint) => endpoint.kind === "wheel" && getWheelWorldSlotOccupant(world.wheels[endpoint.wheelId], world.connectedWorldSlots[endpoint.wheelId]) !== null ? PEARL_DIAMETER_GRID_UNITS : 0,
    onTerminal: (transit, endpoint) => {
      if (endpoint.kind !== "wheel") throw new Error("Wheel transfer cannot enter a dispatcher.");
      if (getWheelWorldSlotOccupant(world.wheels[endpoint.wheelId], world.connectedWorldSlots[endpoint.wheelId]) !== null) bounce(world, transit, endpoint.wheelId, getComponent(world, transit.currentComponentId).id);
      else land(world, transit, endpoint.wheelId);
    },
    onHandoff: (transit, from) => world.lastEvents.push({ type: "SEGMENT_HANDOFF", ballId: transit.ball.id, pathId: world.pathId, fromSegmentId: getComponent(world, from).id, toSegmentId: getComponent(world, transit.currentComponentId).id, tick: world.tick }),
    onCollision: (first, second) => world.lastEvents.push({
      type: "BALL_COLLIDED", ballIds: [first.ball.id, second.ball.id], pathId: world.pathId,
      segmentId: getComponent(world, first.currentComponentId).id,
      contacts: [first, second].map((transit) => ({ componentId: transit.currentComponentId, localProgress: transit.localProgress })) as [ComponentContact, ComponentContact], tick: world.tick
    })
  }, WHEEL_TRANSFER_FIXED_TICK_MS);
}

function createDefaultConnections(
  components: readonly ComponentTransitSegment[],
  topWheelId: string,
  bottomWheelId: string
): ComponentConnectionDefinition[] {
  const connections: ComponentConnectionDefinition[] = [];
  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    connections.push({
      componentId: component.componentId,
      exitEdge: component.exitEdge,
      endpoint: index === components.length - 1
        ? { kind: "wheel", wheelId: bottomWheelId, entryEdge: "north" }
        : { kind: "component", componentId: components[index + 1].componentId, entryEdge: components[index + 1].entryEdge }
    });
    connections.push({
      componentId: component.componentId,
      exitEdge: component.entryEdge,
      endpoint: index === 0
        ? { kind: "wheel", wheelId: topWheelId, entryEdge: "south" }
        : { kind: "component", componentId: components[index - 1].componentId, entryEdge: components[index - 1].exitEdge }
    });
  }
  return connections;
}

function createTerminalPorts(
  components: readonly ComponentTransitSegment[],
  topWheelId: string,
  bottomWheelId: string
): readonly ComponentTerminalPort[] {
  const first = components[0];
  const last = components.at(-1);
  if (!first || !last) throw new Error("Transit route requires at least one component.");
  return [
    { kind: "wheel", id: topWheelId, edge: "south", point: first.entry },
    { kind: "wheel", id: bottomWheelId, edge: "north", point: last.exit }
  ];
}

function resolveConnection(world: WheelTransferWorld, transit: ActiveTransit): WheelTransferConnectionEndpoint {
  const segment = getComponent(world, transit.currentComponentId);
  const exitEdge = transit.direction === "forward" ? segment.exitEdge : segment.entryEdge;
  const endpoint = resolveComponentConnection(world.connectionState, transit.currentComponentId, exitEdge);
  if (endpoint.kind === "dispatcher") throw new Error("Wheel transfer components cannot resolve to dispatchers.");
  return endpoint;
}

function validateConnectionOptions(
  options: readonly ComponentConnectionOption[],
  components: readonly ComponentTransitSegment[],
  topWheelId: string,
  bottomWheelId: string
): void {
  const componentIds = new Set(components.map((component) => component.componentId));
  for (const { componentId, endpoint } of options) {
    const sourceIsValid = componentIds.has(componentId);
    const endpointIsValid = endpoint.kind === "component"
      ? componentIds.has(endpoint.componentId)
      : endpoint.kind === "wheel"
        ? endpoint.wheelId === topWheelId || endpoint.wheelId === bottomWheelId
        : false;
    if (!sourceIsValid || !endpointIsValid) throw new Error("Connection option references an unknown transfer endpoint.");
  }
}

function bounce(world: WheelTransferWorld, transit: ActiveTransit, destinationWheelId: string, segmentId: string): void {
  const sourceWheelId = transit.fromWheelId;
  const source = world.wheels[sourceWheelId];
  const target = world.wheels[destinationWheelId];
  transit.direction = transit.direction === "forward" ? "back" : "forward";
  world.lastEvents.push({
    type: "BALL_BOUNCED",
    ballId: transit.ball.id,
    fromWheelId: sourceWheelId,
    toWheelId: destinationWheelId,
    sourceLocalSlotIndex: worldToLocalSlot(world.connectedWorldSlots[sourceWheelId], source.rotationStep, source.slotCount),
    targetLocalSlotIndex: worldToLocalSlot(world.connectedWorldSlots[destinationWheelId], target.rotationStep, target.slotCount),
    segmentId,
    localProgress: transit.localProgress,
    tick: world.tick
  });
}

function land(world: WheelTransferWorld, transit: ActiveTransit, destinationWheelId: string): void {
  const destination = world.wheels[destinationWheelId];
  const sourceWheelId = transit.fromWheelId;
  const source = world.wheels[sourceWheelId];
  const targetLocalSlotIndex = worldToLocalSlot(world.connectedWorldSlots[destinationWheelId], destination.rotationStep, destination.slotCount);
  const sourceLocalSlotIndex = worldToLocalSlot(world.connectedWorldSlots[sourceWheelId], source.rotationStep, source.slotCount);
  setWheelWorldSlotOccupant(destination, world.connectedWorldSlots[destinationWheelId], transit.ball.id);
  world.activeTransits.delete(transit.ball.id);
  world.lastEvents.push(
    { type: "BALL_LANDED", ballId: transit.ball.id, wheelId: destinationWheelId, localSlotIndex: targetLocalSlotIndex, tick: world.tick },
    { type: "BALL_TRANSFERRED", ballId: transit.ball.id, fromWheelId: sourceWheelId, toWheelId: destinationWheelId, sourceLocalSlotIndex, targetLocalSlotIndex, tick: world.tick }
  );
}


function getComponent(world: WheelTransferWorld, componentId: string): ComponentTransitSegment {
  const component = world.componentCatalog.get(componentId);
  if (!component) throw new Error(`Unknown transit component "${componentId}".`);
  return component;
}

function normalizeRotationStep(step: number, slotCount: number): number {
  return ((step % slotCount) + slotCount) % slotCount;
}

function assertConnectedWorldSlot(value: number, slotCount: number, endpoint: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= slotCount) {
    throw new Error(`${endpoint} connected world slot must be an integer within wheelSlotCount.`);
  }
}
