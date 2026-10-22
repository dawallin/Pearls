import type { BallColor, BallId, BallSeed, BallState } from "../ball/ballState";
import { PEARL_DIAMETER_GRID_UNITS, REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS } from "../geometry/physicalGeometry";
import type { GridLevelDefinition } from "../level/gridLevel";
import { getRefillDelayMs, type RefillSpeed } from "./refillSpeed";
import { createWheelState, getWheelSlotsSnapshot, getWheelWorldSlotOccupant, mod, rotateWheelState, setWheelWorldSlotOccupant, type MutableWheelState } from "../wheel/wheelState";
import { evaluateWheelClearRule, type WheelClearRule } from "../wheel/wheelClearRule";
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
import type { ComponentTransitEdge, ComponentTransitState } from "./componentTransitState";
import { advanceComponentTransits } from "./componentTransitSystem";
import { buildDispatcherComponentTransitRoute, type ComponentTransitSegment, type CorePoint, type DispatcherTransitSegment } from "./componentTransitRoute";

export const DISPATCH_TRANSIT_TRAVEL_MS = 520;
export const DISPATCH_BOARD_FIXED_TICK_MS = 16;
const DEBUG_EVENT_HISTORY_LIMIT = 64;

export type DispatchConnectionEndpoint = ComponentConnectionEndpoint;
export type DispatchConnection = Readonly<{ exitEdge: ComponentTransitEdge; endpoint: DispatchConnectionEndpoint }>;
export type DispatchTransitSnapshot = Readonly<{
  ball: BallState;
  originDispatcherId: string | null;
  sourceElement: Readonly<{ kind: "dispatcher"; dispatcherId: string }> | Readonly<{ kind: "wheel"; wheelId: string }>;
  currentComponentId: string;
  entryEdge: ComponentTransitEdge;
  previousEdge: ComponentTransitEdge;
  direction: "forward" | "back";
  /** Presentation fraction (0..1); authoritative transit progress uses grid distance. */
  localProgress: number;
  endpointIntent: DispatchConnection;
  segment: ComponentTransitSegment;
  position: CorePoint;
}>;

export type DispatchBoardEvent =
  | Readonly<{ type: "BALL_DISPATCHED"; dispatcherId: string; slideId: string; ballId: BallId; color: BallColor; tick: number; timeMs: number }>
  | Readonly<{ type: "BALL_EJECTED_FROM_WHEEL"; wheelId: string; slideId: string; ballId: BallId; color: BallColor; tick: number; timeMs: number }>
  | Readonly<{ type: "TRANSIT_HANDOFF"; ballId: BallId; componentId: string; exitEdge: ComponentTransitEdge; endpoint: DispatchConnectionEndpoint; tick: number; timeMs: number }>
  | Readonly<{ type: "BALL_LANDED_IN_WHEEL"; slideId: string; wheelId: string; ballId: BallId; color: BallColor; localSlotIndex: number; tick: number; timeMs: number }>
  | Readonly<{ type: "BALL_BOUNCED"; ballId: BallId; color: BallColor; dispatcherId: string; wheelId: string; componentId: string; localProgress: number; tick: number; timeMs: number }>
  | Readonly<{ type: "BALL_BURNED_AT_DISPATCHER"; ballId: BallId; color: BallColor; dispatcherId: string; tick: number; timeMs: number }>
  | Readonly<{ type: "BALL_COLLIDED"; ballIds: readonly [BallId, BallId]; pathId: string; componentId: string; contacts: readonly [Readonly<{ componentId: string; localProgress: number }>, Readonly<{ componentId: string; localProgress: number }>]; tick: number; timeMs: number }>
  | Readonly<{ type: "WHEEL_CLEARED"; wheelId: string; color?: BallColor; consumedBallIds: readonly BallId[]; clearCount: number; tick: number; timeMs: number }>
  | Readonly<{ type: "DISPATCHER_REFILLED"; dispatcherId: string; ballId: BallId; color: BallColor; tick: number; timeMs: number }>
  | Readonly<{ type: "WHEEL_ROTATED"; wheelId: string; steps: number; rotationStep: number; tick: number; timeMs: number }>;

export type DispatchBoardConfig = Readonly<{
  level?: GridLevelDefinition;
  dispatcherId?: string;
  slideId?: string;
  dispatchers?: readonly DispatchBoardDispatcherConfig[];
  wheelId: string;
  wheelSlotCount: number;
  wheelClearRule?: WheelClearRule;
  dispatcherHasInitialBall?: boolean;
  initialRotationStep?: number;
  connectedLocalSlotIndex?: number;
  initialBall?: BallSeed;
  refillQueue?: readonly DispatchBoardQueuedBallConfig[];
  transitTravelMs?: number;
  connectionOptions?: readonly ComponentConnectionOption[];
}>;
export type DispatchBoardQueuedBallConfig = BallSeed & Readonly<{ refillSpeed: RefillSpeed }>;
export type DispatchBoardDispatcherConfig = Readonly<{
  id: string;
  slideId?: string;
  hasInitialBall?: boolean;
  initialBall?: BallSeed;
  refillQueue?: readonly DispatchBoardQueuedBallConfig[];
  connectedWorldSlotIndex?: number;
  entryEdge?: ComponentTransitEdge;
  transitSegment?: DispatcherTransitSegment;
  transitSegments?: readonly ComponentTransitSegment[];
}>;
export type DispatchBoardBallSnapshot = BallState;
export type DispatchBoardSnapshot = Readonly<{
  tick: number;
  timeMs: number;
  balls: Readonly<Record<BallId, BallState>>;
  dispatcher: DispatchBoardDispatcherSnapshot;
  dispatchers: readonly DispatchBoardDispatcherSnapshot[];
  slide: Readonly<{ id: string }>;
  activeTransits: readonly DispatchTransitSnapshot[];
  pendingTransitCount: number;
  lastHandoffEvent: Extract<DispatchBoardEvent, { type: "TRANSIT_HANDOFF" }> | null;
  lastBounceEvent: Extract<DispatchBoardEvent, { type: "BALL_BOUNCED" }> | null;
  lastBurnEvent: Extract<DispatchBoardEvent, { type: "BALL_BURNED_AT_DISPATCHER" }> | null;
  wheel: Readonly<{ id: string; slotCount: number; clearRule: WheelClearRule | undefined; targetColors: readonly BallColor[] | null; clearCount: number; lastClearEvent: Extract<DispatchBoardEvent, { type: "WHEEL_CLEARED" }> | null; rotationStep: number; ballLocalSlotIndex: number | null; slots: readonly (DispatchBoardBallSnapshot | null)[]; slotBallIds: readonly (BallId | null)[] }>;
  lastEvents: readonly DispatchBoardEvent[];
}>;
export type DispatchBoardCommandResult = Readonly<{ dispatcherId: string; slideId: string; ball: BallState }>;
export type WheelEjectionCommandResult = Readonly<{ wheelId: string; ball: BallState }>;
export type DispatchBoardRotationResult = Readonly<{ wheelId: string; steps: number; rotationStep: number }>;

type DispatchBoardDispatcherSnapshot = Readonly<{ id: string; slideId: string; hasBall: boolean; ball: DispatchBoardBallSnapshot | null; refillReadyAtMs: number | null; queuedBalls: readonly DispatchBoardBallSnapshot[]; connectedWorldSlotIndex: number }>;
type DispatchBoardQueuedBall = Readonly<{ ballId: BallId; delayMs: number }>;
type DispatchBoardDispatcherState = {
  id: string;
  slideId: string;
  heldBallId: BallId | null;
  refillReadyAtMs: number | null;
  queue: DispatchBoardQueuedBall[];
  connectedWorldSlotIndex: number;
  segments: readonly ComponentTransitSegment[];
};
type ActiveDispatchTransit = ComponentTransitState & {
  ballId: BallId;
  sourceElement: Readonly<{ kind: "dispatcher"; dispatcherId: string }> | Readonly<{ kind: "wheel"; wheelId: string }>;
};
type DispatchBoardCommand =
  | Readonly<{ type: "DISPATCH_BALL"; dispatcherId: string; ballId: BallId }>
  | Readonly<{ type: "EJECT_WHEEL_BALL"; dispatcherId: string; ballId: BallId }>
  | Readonly<{ type: "SET_CONNECTION"; componentId: string; exitEdge: ComponentTransitEdge; endpoint: DispatchConnectionEndpoint }>
  | Readonly<{ type: "ROTATE_WHEEL"; steps: number }>;

export type DispatchBoardWorld = {
  tick: number;
  timeMs: number;
  balls: Record<BallId, BallState>;
  dispatchers: Map<string, DispatchBoardDispatcherState>;
  primaryDispatcherId: string;
  wheel: MutableWheelState;
  wheelClearRule: WheelClearRule | undefined;
  wheelClearCount: number;
  lastClearEvent: Extract<DispatchBoardEvent, { type: "WHEEL_CLEARED" }> | null;
  transitTravelMs: number;
  accumulatedMs: number;
  activeTransits: Map<BallId, ActiveDispatchTransit>;
  componentCatalog: Map<string, ComponentTransitSegment>;
  connectionState: ComponentConnectionState;
  pendingCommands: DispatchBoardCommand[];
  pendingDispatchers: Set<string>;
  pendingWheelBallId: BallId | null;
  lastHandoffEvent: Extract<DispatchBoardEvent, { type: "TRANSIT_HANDOFF" }> | null;
  lastBounceEvent: Extract<DispatchBoardEvent, { type: "BALL_BOUNCED" }> | null;
  lastBurnEvent: Extract<DispatchBoardEvent, { type: "BALL_BURNED_AT_DISPATCHER" }> | null;
  lastEvents: DispatchBoardEvent[];
};

export function createDispatchBoardWorld(config: DispatchBoardConfig): DispatchBoardWorld {
  if (!Number.isInteger(config.wheelSlotCount) || config.wheelSlotCount <= 0) throw new Error("wheelSlotCount must be a positive integer.");
  const transitTravelMs = config.transitTravelMs ?? DISPATCH_TRANSIT_TRAVEL_MS;
  if (!Number.isFinite(transitTravelMs) || transitTravelMs <= 0) throw new Error("transitTravelMs must be a positive finite number.");
  const configs = config.dispatchers ?? [{
    id: config.dispatcherId ?? "dispatcher",
    slideId: config.slideId ?? "slide",
    hasInitialBall: config.dispatcherHasInitialBall ?? true,
    initialBall: config.initialBall,
    refillQueue: config.refillQueue,
    connectedWorldSlotIndex: config.connectedLocalSlotIndex ?? 0
  }];
  if (!configs.length) throw new Error("Dispatch board must have at least one dispatcher.");

  const balls: Record<BallId, BallState> = {};
  const dispatchers = new Map<string, DispatchBoardDispatcherState>();
  const connectionDefaults: ComponentConnectionDefinition[] = [];
  const componentIds = new Set<string>();
  const allSegments: ComponentTransitSegment[] = [];
  const terminalPorts: ComponentTerminalPort[] = [];

  for (const configItem of configs) {
    if (dispatchers.has(configItem.id)) throw new Error(`Duplicate dispatcher "${configItem.id}".`);
    const heldBall = createInitialBall(configItem);
    const queue = (configItem.refillQueue ?? []).map((item, index) => {
      const delayMs = getRefillDelayMs(item.refillSpeed);
      const ball = createBallFromSeed(item, `${configItem.id}:ball-${index + 2}`);
      registerBall(balls, ball);
      return { ballId: ball.id, delayMs };
    });
    if (heldBall) registerBall(balls, heldBall);

    const segments = resolveDispatcherSegments(config, configItem);
    for (const segment of segments) {
      if (componentIds.has(segment.componentId)) throw new Error(`Transit component "${segment.componentId}" belongs to multiple dispatcher routes.`);
      componentIds.add(segment.componentId);
      allSegments.push(segment);
    }
    appendDispatcherConnections(connectionDefaults, configItem.id, config.wheelId, segments);
    addTerminalPort(terminalPorts, {
      kind: "dispatcher",
      id: configItem.id,
      edge: oppositeEdge(segments[0].entryEdge),
      point: segments[0].entry
    });
    addTerminalPort(terminalPorts, {
      kind: "wheel",
      id: config.wheelId,
      edge: oppositeEdge(segments.at(-1)!.exitEdge),
      point: segments.at(-1)!.exit
    });
    dispatchers.set(configItem.id, {
      id: configItem.id,
      slideId: segments[0].componentId,
      heldBallId: heldBall?.id ?? null,
      refillReadyAtMs: null,
      queue,
      connectedWorldSlotIndex: mod(configItem.connectedWorldSlotIndex ?? 0, config.wheelSlotCount),
      segments
    });
  }

  validateConnectionOptions(config.connectionOptions ?? [], componentIds, dispatchers, config.wheelId);
  return {
    tick: 0,
    timeMs: 0,
    balls,
    dispatchers,
    primaryDispatcherId: configs[0].id,
    wheel: createWheelState({ id: config.wheelId, slotCount: config.wheelSlotCount, initialRotationStep: config.initialRotationStep }),
    wheelClearRule: config.wheelClearRule,
    wheelClearCount: 0,
    lastClearEvent: null,
    transitTravelMs,
    accumulatedMs: 0,
    activeTransits: new Map(),
    componentCatalog: new Map(allSegments.map((segment) => [segment.componentId, segment])),
    connectionState: createComponentConnectionState(connectionDefaults, config.connectionOptions, allSegments, terminalPorts),
    pendingCommands: [],
    pendingDispatchers: new Set(),
    pendingWheelBallId: null,
    lastHandoffEvent: null,
    lastBounceEvent: null,
    lastBurnEvent: null,
    lastEvents: []
  };
}

/** Queues an allowed component exit change for the next fixed-tick boundary. */
export function setDispatchConnection(
  world: DispatchBoardWorld,
  componentId: string,
  exitEdge: ComponentTransitEdge,
  connection: DispatchConnection
): void {
  if (connection.exitEdge !== exitEdge) throw new Error(`Connection exit edge must match "${componentId}:${exitEdge}".`);
  if (!isComponentConnectionAllowed(world.connectionState, componentId, exitEdge, connection.endpoint)) {
    throw new Error(`Endpoint is not a valid connection option for "${componentId}:${exitEdge}".`);
  }
  world.pendingCommands.push({ type: "SET_CONNECTION", componentId, exitEdge, endpoint: { ...connection.endpoint } });
}

/** Queues dispatch for the next fixed tick without mutating authoritative state. */
export function dispatchBall(world: DispatchBoardWorld, dispatcherId = world.primaryDispatcherId): DispatchBoardCommandResult | null {
  const dispatcher = world.dispatchers.get(dispatcherId);
  if (!dispatcher?.heldBallId || world.pendingDispatchers.has(dispatcherId)) return null;
  const ball = requireBall(world, dispatcher.heldBallId);
  world.pendingCommands.push({ type: "DISPATCH_BALL", dispatcherId, ballId: ball.id });
  world.pendingDispatchers.add(dispatcherId);
  return { dispatcherId, slideId: dispatcher.slideId, ball: { ...ball } };
}

/** Queues an aligned wheel pearl into its adjacent slide without inspecting the far endpoint. */
export function ejectBallFromWheel(world: DispatchBoardWorld, localSlotIndex: number): WheelEjectionCommandResult | null {
  if (!Number.isInteger(localSlotIndex) || world.pendingWheelBallId !== null) return null;
  const dispatcher = [...world.dispatchers.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .find((candidate) => mod(candidate.connectedWorldSlotIndex - world.wheel.rotationStep, world.wheel.slotCount) === localSlotIndex);
  if (!dispatcher) return null;
  const ballId = getWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex);
  if (!ballId) return null;
  const ball = requireBall(world, ballId);
  world.pendingCommands.push({ type: "EJECT_WHEEL_BALL", dispatcherId: dispatcher.id, ballId });
  world.pendingWheelBallId = ballId;
  return { wheelId: world.wheel.id, ball: { ...ball } };
}

export function advanceDispatchBoardTime(world: DispatchBoardWorld, deltaMs: number): readonly DispatchBoardEvent[] {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("deltaMs must be a non-negative finite number.");
  world.accumulatedMs += deltaMs;
  const batch: DispatchBoardEvent[] = [];
  while (world.accumulatedMs >= DISPATCH_BOARD_FIXED_TICK_MS) {
    world.accumulatedMs -= DISPATCH_BOARD_FIXED_TICK_MS;
    world.tick += 1;
    world.timeMs += DISPATCH_BOARD_FIXED_TICK_MS;
    const tickEvents: DispatchBoardEvent[] = [];
    applyCommandsAtTickStart(world, tickEvents);
    resolveRefills(world, tickEvents);
    advanceTransits(world, tickEvents);
    batch.push(...tickEvents);
    appendEventHistory(world, tickEvents);
  }
  return batch;
}

/** Queues rotation for the next fixed tick and returns the deterministic predicted step. */
export function rotateWheelClockwise(world: DispatchBoardWorld, steps = 1): DispatchBoardRotationResult | null {
  if (!Number.isInteger(steps) || steps === 0) return null;
  const queuedSteps = world.pendingCommands.reduce((sum, command) => sum + (command.type === "ROTATE_WHEEL" ? command.steps : 0), 0);
  world.pendingCommands.push({ type: "ROTATE_WHEEL", steps });
  return { wheelId: world.wheel.id, steps, rotationStep: mod(world.wheel.rotationStep + queuedSteps + steps, world.wheel.slotCount) };
}

export function getDispatchBoardSnapshot(world: DispatchBoardWorld): DispatchBoardSnapshot {
  const dispatchers = [...world.dispatchers.values()].map((dispatcher) => dispatcherSnapshot(world, dispatcher));
  const primary = world.dispatchers.get(world.primaryDispatcherId) ?? [...world.dispatchers.values()][0];
  const slotBallIds = getWheelSlotsSnapshot(world.wheel);
  const slots = slotBallIds.map((id) => getBallSnapshot(world, id));
  const first = slotBallIds.findIndex((id) => id !== null);
  const activeTransits = [...world.activeTransits.values()]
    .sort((left, right) => left.ballId.localeCompare(right.ballId))
    .map((transit) => transitSnapshot(world, transit));
  return {
    tick: world.tick,
    timeMs: world.timeMs,
    balls: Object.fromEntries(Object.entries(world.balls).map(([id, ball]) => [id, { ...ball }])),
    dispatcher: dispatcherSnapshot(world, primary),
    dispatchers,
    slide: { id: primary.slideId },
    activeTransits,
    pendingTransitCount: world.pendingDispatchers.size + (world.pendingWheelBallId === null ? 0 : 1),
    lastHandoffEvent: world.lastHandoffEvent ? { ...world.lastHandoffEvent } : null,
    lastBounceEvent: world.lastBounceEvent ? { ...world.lastBounceEvent } : null,
    lastBurnEvent: world.lastBurnEvent ? { ...world.lastBurnEvent } : null,
    wheel: {
      id: world.wheel.id,
      slotCount: world.wheel.slotCount,
      clearRule: world.wheelClearRule,
      targetColors: world.wheelClearRule?.type === "pattern" ? [...world.wheelClearRule.targetColors] : null,
      clearCount: world.wheelClearCount,
      lastClearEvent: world.lastClearEvent ? { ...world.lastClearEvent } : null,
      rotationStep: world.wheel.rotationStep,
      ballLocalSlotIndex: first >= 0 ? first : null,
      slots,
      slotBallIds
    },
    lastEvents: world.lastEvents.map((event) => ({ ...event }))
  };
}

function applyCommandsAtTickStart(world: DispatchBoardWorld, events: DispatchBoardEvent[]): void {
  const commands = world.pendingCommands.splice(0);
  for (const command of commands) {
    if (command.type === "SET_CONNECTION") {
      setComponentConnection(world.connectionState, command.componentId, command.exitEdge, command.endpoint);
      continue;
    }
    if (command.type === "ROTATE_WHEEL") {
      rotateWheelState(world.wheel, command.steps);
      events.push({ type: "WHEEL_ROTATED", wheelId: world.wheel.id, steps: command.steps, rotationStep: world.wheel.rotationStep, tick: world.tick, timeMs: world.timeMs });
      continue;
    }
    if (command.type === "EJECT_WHEEL_BALL") {
      world.pendingWheelBallId = null;
      const dispatcher = world.dispatchers.get(command.dispatcherId);
      if (!dispatcher || getWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex) !== command.ballId) continue;
      const ball = requireBall(world, command.ballId);
      setWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex, null);
      const lastSegment = dispatcher.segments.at(-1)!;
      world.activeTransits.set(ball.id, {
        ballId: ball.id,
        sourceElement: { kind: "wheel", wheelId: world.wheel.id },
        currentComponentId: lastSegment.componentId,
        entryEdge: lastSegment.exitEdge,
        previousEdge: lastSegment.exitEdge,
        direction: "back",
        localProgress: lastSegment.length
      });
      events.push({ type: "BALL_EJECTED_FROM_WHEEL", wheelId: world.wheel.id, slideId: lastSegment.componentId, ballId: ball.id, color: ball.color, tick: world.tick, timeMs: world.timeMs });
      continue;
    }
    world.pendingDispatchers.delete(command.dispatcherId);
    const dispatcher = world.dispatchers.get(command.dispatcherId);
    if (!dispatcher || dispatcher.heldBallId !== command.ballId) continue;
    const ball = requireBall(world, command.ballId);
    dispatcher.heldBallId = null;
    scheduleNextRefill(world, dispatcher);
    const firstSegment = dispatcher.segments[0];
    world.activeTransits.set(ball.id, {
      ballId: ball.id,
      sourceElement: { kind: "dispatcher", dispatcherId: dispatcher.id },
      currentComponentId: firstSegment.componentId,
      entryEdge: firstSegment.entryEdge,
      previousEdge: firstSegment.entryEdge,
      direction: "forward",
      localProgress: 0
    });
    events.push({ type: "BALL_DISPATCHED", dispatcherId: dispatcher.id, slideId: firstSegment.componentId, ballId: ball.id, color: ball.color, tick: world.tick, timeMs: world.timeMs });
  }
}

function advanceTransits(world: DispatchBoardWorld, events: DispatchBoardEvent[]): void {
  advanceComponentTransits({
    transits: () => [...world.activeTransits.values()],
    id: (transit) => transit.ballId,
    getSegment: (id) => requireSegment(world, id),
    connections: world.connectionState,
    speed: REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS / world.transitTravelMs,
    terminalClearance: (transit, endpoint) => endpoint.kind === "wheel" && isWheelEndpointOccupied(world, wheelPortDispatcher(world, transit.currentComponentId), endpoint.wheelId) ? PEARL_DIAMETER_GRID_UNITS : 0,
    onTerminal: (transit, endpoint) => {
      const segment = requireSegment(world, transit.currentComponentId);
      const edge = transit.direction === "forward" ? segment.exitEdge : segment.entryEdge;
      if (endpoint.kind === "wheel" && isWheelEndpointOccupied(world, wheelPortDispatcher(world, transit.currentComponentId), endpoint.wheelId)) bounceTransit(world, transit, endpoint.wheelId, events);
      else resolveTransitBoundary(world, transit, edge, endpoint, events);
    },
    onHandoff: (transit, from, exitEdge, endpoint) => {
      world.lastHandoffEvent = { type: "TRANSIT_HANDOFF", ballId: transit.ballId, componentId: from, exitEdge, endpoint: { ...endpoint }, tick: world.tick, timeMs: world.timeMs };
      events.push(world.lastHandoffEvent);
    },
    onCollision: (first, second) => events.push({
      type: "BALL_COLLIDED", ballIds: [first.ballId, second.ballId],
      pathId: `slide-path:${[first.currentComponentId, second.currentComponentId].sort().join(":")}`,
      componentId: first.currentComponentId,
      contacts: [first, second].map((transit) => ({ componentId: transit.currentComponentId, localProgress: transit.localProgress })) as [Readonly<{ componentId: string; localProgress: number }>, Readonly<{ componentId: string; localProgress: number }>],
      tick: world.tick, timeMs: world.timeMs
    })
  }, DISPATCH_BOARD_FIXED_TICK_MS);
}

/** Resolve the physical receiving wheel port, independent of the pearl's source. */
function wheelPortDispatcher(world: DispatchBoardWorld, componentId: string): DispatchBoardDispatcherState {
  const dispatcher = [...world.dispatchers.values()].find((candidate) => candidate.segments.at(-1)?.componentId === componentId);
  if (!dispatcher) throw new Error(`Component "${componentId}" has no wheel port.`);
  return dispatcher;
}

function resolveTransitBoundary(
  world: DispatchBoardWorld,
  transit: ActiveDispatchTransit,
  exitEdge: ComponentTransitEdge,
  endpoint: DispatchConnectionEndpoint,
  events: DispatchBoardEvent[]
): void {
  const ball = requireBall(world, transit.ballId);
  world.lastHandoffEvent = { type: "TRANSIT_HANDOFF", ballId: ball.id, componentId: transit.currentComponentId, exitEdge, endpoint: { ...endpoint }, tick: world.tick, timeMs: world.timeMs };
  events.push(world.lastHandoffEvent);
  if (endpoint.kind === "dispatcher") {
    delete world.balls[ball.id];
    world.activeTransits.delete(ball.id);
    world.lastBurnEvent = { type: "BALL_BURNED_AT_DISPATCHER", ballId: ball.id, color: ball.color, dispatcherId: endpoint.dispatcherId, tick: world.tick, timeMs: world.timeMs };
    events.push(world.lastBurnEvent);
    return;
  }
  if (endpoint.kind === "wheel") {
    if (endpoint.wheelId !== world.wheel.id) throw new Error(`Unknown wheel endpoint "${endpoint.wheelId}".`);
    const dispatcher = wheelPortDispatcher(world, transit.currentComponentId);
    if (isWheelEndpointOccupied(world, dispatcher, endpoint.wheelId)) {
      bounceTransit(world, transit, endpoint.wheelId, events);
      return;
    }
    const localSlotIndex = setWheelWorldSlotOccupant(world.wheel, dispatcher.connectedWorldSlotIndex, ball.id);
    world.activeTransits.delete(ball.id);
    events.push({ type: "BALL_LANDED_IN_WHEEL", slideId: transit.currentComponentId, wheelId: world.wheel.id, ballId: ball.id, color: ball.color, localSlotIndex, tick: world.tick, timeMs: world.timeMs });
    evaluateClear(world, events);
    return;
  }
  throw new Error("Component handoffs belong to the shared transit system.");
}

function bounceTransit(world: DispatchBoardWorld, transit: ActiveDispatchTransit, wheelId: string, events: DispatchBoardEvent[]): void {
  const dispatcher = wheelPortDispatcher(world, transit.currentComponentId);
  transit.direction = transit.direction === "forward" ? "back" : "forward";
  world.lastBounceEvent = {
    type: "BALL_BOUNCED",
    ballId: transit.ballId,
    color: requireBall(world, transit.ballId).color,
    dispatcherId: dispatcher.id,
    wheelId,
    componentId: transit.currentComponentId,
    localProgress: transit.localProgress / requireSegment(world, transit.currentComponentId).length,
    tick: world.tick,
    timeMs: world.timeMs
  };
  events.push(world.lastBounceEvent);
}

function resolveDispatcherSegments(config: DispatchBoardConfig, dispatcher: DispatchBoardDispatcherConfig): readonly ComponentTransitSegment[] {
  if (config.level) return buildDispatcherComponentTransitRoute(config.level, dispatcher.id, config.wheelId).segments;
  if (dispatcher.transitSegments?.length) return dispatcher.transitSegments;
  const slideId = dispatcher.slideId ?? "slide";
  const entryEdge = dispatcher.entryEdge ?? "north";
  const geometry = dispatcher.transitSegment ?? {
    entry: { x: 0, y: 0 },
    exit: { x: REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS, y: 0 },
    length: REFERENCE_TWO_SLIDE_ROUTE_LENGTH_GRID_UNITS
  };
  return [{
    id: `segment:${slideId}`,
    componentId: slideId,
    componentType: entryEdge === "west" || entryEdge === "east" ? "horizontalSlide" : "verticalSlide",
    entryEdge,
    exitEdge: oppositeEdge(entryEdge),
    ...geometry
  }];
}

function appendDispatcherConnections(
  connections: ComponentConnectionDefinition[],
  dispatcherId: string,
  wheelId: string,
  segments: readonly ComponentTransitSegment[]
): void {
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    connections.push({
      componentId: segment.componentId,
      exitEdge: segment.exitEdge,
      endpoint: index === segments.length - 1
        ? { kind: "wheel", wheelId, entryEdge: oppositeEdge(segment.exitEdge) }
        : { kind: "component", componentId: segments[index + 1].componentId, entryEdge: segments[index + 1].entryEdge }
    });
    connections.push({
      componentId: segment.componentId,
      exitEdge: segment.entryEdge,
      endpoint: index === 0
        ? { kind: "dispatcher", dispatcherId, entryEdge: oppositeEdge(segment.entryEdge) }
        : { kind: "component", componentId: segments[index - 1].componentId, entryEdge: segments[index - 1].exitEdge }
    });
  }
}

function addTerminalPort(ports: ComponentTerminalPort[], port: ComponentTerminalPort): void {
  const existing = ports.find((candidate) => candidate.kind === port.kind && candidate.id === port.id && candidate.edge === port.edge);
  if (!existing) {
    ports.push(port);
    return;
  }
  if (Math.hypot(existing.point.x - port.point.x, existing.point.y - port.point.y) > 1e-8) {
    throw new Error(`Terminal port "${port.kind}:${port.id}:${port.edge}" has conflicting level geometry.`);
  }
}

function validateConnectionOptions(
  options: readonly ComponentConnectionOption[],
  componentIds: ReadonlySet<string>,
  dispatchers: ReadonlyMap<string, DispatchBoardDispatcherState>,
  wheelId: string
): void {
  for (const { endpoint } of options) {
    const valid = endpoint.kind === "component"
      ? componentIds.has(endpoint.componentId)
      : endpoint.kind === "dispatcher"
        ? dispatchers.has(endpoint.dispatcherId)
        : endpoint.wheelId === wheelId;
    if (!valid) throw new Error("Connection option references an unknown board endpoint.");
  }
}

function isWheelEndpointOccupied(world: DispatchBoardWorld, dispatcher: DispatchBoardDispatcherState, wheelId: string): boolean {
  if (wheelId !== world.wheel.id) throw new Error(`Unknown wheel endpoint "${wheelId}".`);
  const localSlot = mod(dispatcher.connectedWorldSlotIndex - world.wheel.rotationStep, world.wheel.slotCount);
  return getWheelSlotsSnapshot(world.wheel)[localSlot] !== null;
}

function resolveRefills(world: DispatchBoardWorld, events: DispatchBoardEvent[]): void {
  for (const dispatcher of world.dispatchers.values()) {
    if (dispatcher.heldBallId !== null || dispatcher.refillReadyAtMs === null || world.timeMs < dispatcher.refillReadyAtMs) continue;
    const queued = dispatcher.queue.shift();
    dispatcher.refillReadyAtMs = null;
    if (!queued) continue;
    const ball = requireBall(world, queued.ballId);
    dispatcher.heldBallId = ball.id;
    events.push({ type: "DISPATCHER_REFILLED", dispatcherId: dispatcher.id, ballId: ball.id, color: ball.color, tick: world.tick, timeMs: world.timeMs });
  }
}

function evaluateClear(world: DispatchBoardWorld, events: DispatchBoardEvent[]): void {
  const match = evaluateWheelClearRule(world.wheelClearRule, world.wheel.slots, world.balls);
  if (!match) return;
  world.wheelClearCount += 1;
  for (const id of match.consumedBallIds) delete world.balls[id];
  world.wheel.slots.fill(null);
  world.lastClearEvent = { type: "WHEEL_CLEARED", wheelId: world.wheel.id, ...match, clearCount: world.wheelClearCount, tick: world.tick, timeMs: world.timeMs };
  events.push(world.lastClearEvent);
}

function transitSnapshot(world: DispatchBoardWorld, transit: ActiveDispatchTransit): DispatchTransitSnapshot {
  const segment = requireSegment(world, transit.currentComponentId);
  const exitEdge = transit.direction === "forward" ? segment.exitEdge : segment.entryEdge;
  const endpoint = resolveComponentConnection(world.connectionState, segment.componentId, exitEdge);
  return {
    ball: { ...requireBall(world, transit.ballId) },
    originDispatcherId: transit.sourceElement.kind === "dispatcher" ? transit.sourceElement.dispatcherId : null,
    sourceElement: { ...transit.sourceElement },
    currentComponentId: transit.currentComponentId,
    entryEdge: transit.entryEdge,
    previousEdge: transit.previousEdge,
    direction: transit.direction,
    localProgress: transit.localProgress / segment.length,
    endpointIntent: { exitEdge, endpoint: { ...endpoint } },
    segment,
    position: {
      x: segment.entry.x + (segment.exit.x - segment.entry.x) * (transit.localProgress / segment.length),
      y: segment.entry.y + (segment.exit.y - segment.entry.y) * (transit.localProgress / segment.length)
    }
  };
}

function appendEventHistory(world: DispatchBoardWorld, events: readonly DispatchBoardEvent[]): void {
  if (events.length === 0) return;
  world.lastEvents.push(...events);
  if (world.lastEvents.length > DEBUG_EVENT_HISTORY_LIMIT) world.lastEvents.splice(0, world.lastEvents.length - DEBUG_EVENT_HISTORY_LIMIT);
}

function requireSegment(world: DispatchBoardWorld, componentId: string): ComponentTransitSegment {
  const segment = world.componentCatalog.get(componentId);
  if (!segment) throw new Error(`Unknown transit component "${componentId}".`);
  return segment;
}

function dispatcherSnapshot(world: DispatchBoardWorld, dispatcher: DispatchBoardDispatcherState): DispatchBoardDispatcherSnapshot {
  return {
    id: dispatcher.id,
    slideId: dispatcher.slideId,
    hasBall: dispatcher.heldBallId !== null,
    ball: getBallSnapshot(world, dispatcher.heldBallId),
    refillReadyAtMs: dispatcher.refillReadyAtMs,
    queuedBalls: dispatcher.queue.map((queued) => ({ ...requireBall(world, queued.ballId) })),
    connectedWorldSlotIndex: dispatcher.connectedWorldSlotIndex
  };
}

function createInitialBall(config: DispatchBoardDispatcherConfig): BallState | null {
  if (config.initialBall) return createBallFromSeed(config.initialBall, `${config.id}:ball`);
  return config.hasInitialBall === false ? null : { id: `${config.id}:ball`, color: "red" };
}
function createBallFromSeed(seed: BallSeed, fallbackId: BallId): BallState { return { id: seed.id ?? fallbackId, color: seed.color }; }
function registerBall(balls: Record<BallId, BallState>, ball: BallState): void { if (balls[ball.id]) throw new Error(`Duplicate ball "${ball.id}".`); balls[ball.id] = ball; }
function scheduleNextRefill(world: DispatchBoardWorld, dispatcher: DispatchBoardDispatcherState): void { const next = dispatcher.queue[0]; dispatcher.refillReadyAtMs = next ? world.timeMs + next.delayMs : null; }
function getBallSnapshot(world: DispatchBoardWorld, ballId: BallId | null): BallState | null { return ballId ? { ...requireBall(world, ballId) } : null; }
function requireBall(world: DispatchBoardWorld, ballId: BallId): BallState { const ball = world.balls[ballId]; if (!ball) throw new Error(`Unknown ball "${ballId}".`); return ball; }
function oppositeEdge(edge: ComponentTransitEdge): ComponentTransitEdge { switch (edge) { case "north": return "south"; case "east": return "west"; case "south": return "north"; case "west": return "east"; } }
