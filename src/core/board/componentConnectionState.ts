import type { ComponentTransitEdge } from "./componentTransitState";
import type { ComponentTransitSegment, CorePoint } from "./componentTransitRoute";

export type ComponentConnectionEndpoint =
  | Readonly<{ kind: "component"; componentId: string; entryEdge: ComponentTransitEdge }>
  | Readonly<{ kind: "wheel"; wheelId: string; entryEdge: ComponentTransitEdge }>
  | Readonly<{ kind: "dispatcher"; dispatcherId: string; entryEdge: ComponentTransitEdge }>;

export type ComponentConnectionDefinition = Readonly<{
  componentId: string;
  exitEdge: ComponentTransitEdge;
  endpoint: ComponentConnectionEndpoint;
}>;

export type ComponentConnectionOption = Readonly<{
  componentId: string;
  exitEdge: ComponentTransitEdge;
  endpoint: ComponentConnectionEndpoint;
}>;

export type ComponentConnectionState = {
  current: Map<string, ComponentConnectionEndpoint>;
  allowed: Map<string, readonly ComponentConnectionEndpoint[]>;
};

/** A placed terminal's physical port, supplied by the level-derived topology. */
export type ComponentTerminalPort = Readonly<{
  kind: "wheel" | "dispatcher";
  id: string;
  edge: ComponentTransitEdge;
  point: CorePoint;
}>;

export function componentConnectionKey(componentId: string, exitEdge: ComponentTransitEdge): string {
  return `${componentId}:${exitEdge}`;
}

export function createComponentConnectionState(
  defaults: readonly ComponentConnectionDefinition[],
  options: readonly ComponentConnectionOption[] = [],
  segments: readonly ComponentTransitSegment[] = [],
  terminalPorts: readonly ComponentTerminalPort[] = []
): ComponentConnectionState {
  const current = new Map<string, ComponentConnectionEndpoint>();
  const allowed = new Map<string, ComponentConnectionEndpoint[]>();

  for (const definition of defaults) {
    validatePhysicalConnection(definition, segments, terminalPorts);
    const key = componentConnectionKey(definition.componentId, definition.exitEdge);
    if (current.has(key)) throw new Error(`Duplicate component connection "${key}".`);
    current.set(key, { ...definition.endpoint });
    allowed.set(key, [{ ...definition.endpoint }]);
  }

  for (const option of options) {
    validatePhysicalConnection(option, segments, terminalPorts);
    const key = componentConnectionKey(option.componentId, option.exitEdge);
    const endpoints = allowed.get(key);
    if (!endpoints) throw new Error(`Connection option requires a default connection for "${key}".`);
    if (!endpoints.some((candidate) => sameComponentConnectionEndpoint(candidate, option.endpoint))) {
      endpoints.push({ ...option.endpoint });
    }
  }

  return { current, allowed };
}

export function resolveComponentConnection(
  state: ComponentConnectionState,
  componentId: string,
  exitEdge: ComponentTransitEdge
): ComponentConnectionEndpoint {
  const endpoint = state.current.get(componentConnectionKey(componentId, exitEdge));
  if (!endpoint) throw new Error(`Missing component connection for "${componentId}:${exitEdge}".`);
  return endpoint;
}

export function setComponentConnection(
  state: ComponentConnectionState,
  componentId: string,
  exitEdge: ComponentTransitEdge,
  endpoint: ComponentConnectionEndpoint
): void {
  const key = componentConnectionKey(componentId, exitEdge);
  if (!isComponentConnectionAllowed(state, componentId, exitEdge, endpoint)) {
    throw new Error(`Endpoint is not a valid connection option for "${key}".`);
  }
  state.current.set(key, { ...endpoint });
}

export function isComponentConnectionAllowed(
  state: ComponentConnectionState,
  componentId: string,
  exitEdge: ComponentTransitEdge,
  endpoint: ComponentConnectionEndpoint
): boolean {
  const allowed = state.allowed.get(componentConnectionKey(componentId, exitEdge)) ?? [];
  return allowed.some((candidate) => sameComponentConnectionEndpoint(candidate, endpoint));
}

export function sameComponentConnectionEndpoint(
  left: ComponentConnectionEndpoint,
  right: ComponentConnectionEndpoint
): boolean {
  if (left.kind !== right.kind || left.entryEdge !== right.entryEdge) return false;
  if (left.kind === "component" && right.kind === "component") return left.componentId === right.componentId;
  if (left.kind === "wheel" && right.kind === "wheel") return left.wheelId === right.wheelId;
  return left.kind === "dispatcher" && right.kind === "dispatcher" && left.dispatcherId === right.dispatcherId;
}

function validatePhysicalConnection(
  definition: ComponentConnectionDefinition | ComponentConnectionOption,
  segments: readonly ComponentTransitSegment[],
  terminalPorts: readonly ComponentTerminalPort[]
): void {
  const endpoint = definition.endpoint;
  if (segments.length === 0) return;
  const source = segments.find((segment) => segment.componentId === definition.componentId);
  if (!source) throw new Error("Component connection references an unknown transit segment.");
  const sourcePoint = pointAtPort(source, definition.exitEdge);
  const targetPoint = endpoint.kind === "component"
    ? pointAtPort(requireComponentSegment(segments, endpoint.componentId), endpoint.entryEdge)
    : requireTerminalPort(terminalPorts, endpoint).point;
  if (
    oppositeEdge(definition.exitEdge) !== endpoint.entryEdge ||
    Math.hypot(sourcePoint.x - targetPoint.x, sourcePoint.y - targetPoint.y) > 1e-8
  ) {
    throw new Error(`Connection "${definition.componentId}:${definition.exitEdge}" is not physically compatible with "${endpointLabel(endpoint)}:${endpoint.entryEdge}".`);
  }
}

function endpointLabel(endpoint: ComponentConnectionEndpoint): string {
  return endpoint.kind === "component" ? endpoint.componentId : endpoint.kind === "wheel" ? endpoint.wheelId : endpoint.dispatcherId;
}

function requireComponentSegment(segments: readonly ComponentTransitSegment[], componentId: string): ComponentTransitSegment {
  const segment = segments.find((candidate) => candidate.componentId === componentId);
  if (!segment) throw new Error("Component connection references an unknown transit segment.");
  return segment;
}

function requireTerminalPort(
  terminalPorts: readonly ComponentTerminalPort[],
  endpoint: Exclude<ComponentConnectionEndpoint, Readonly<{ kind: "component" }>>
): ComponentTerminalPort {
  const id = endpoint.kind === "wheel" ? endpoint.wheelId : endpoint.dispatcherId;
  const terminal = terminalPorts.find((candidate) =>
    candidate.kind === endpoint.kind && candidate.id === id && candidate.edge === endpoint.entryEdge
  );
  if (!terminal) {
    const knownTerminal = terminalPorts.some((candidate) => candidate.kind === endpoint.kind && candidate.id === id);
    if (knownTerminal) throw new Error(`Connection is not physically compatible with terminal "${endpoint.kind}:${id}:${endpoint.entryEdge}".`);
    throw new Error(`Connection references an unknown terminal port "${endpoint.kind}:${id}:${endpoint.entryEdge}".`);
  }
  return terminal;
}

function pointAtPort(segment: ComponentTransitSegment, edge: ComponentTransitEdge): CorePoint {
  if (edge === segment.entryEdge) return segment.entry;
  if (edge === segment.exitEdge) return segment.exit;
  throw new Error(`Component "${segment.componentId}" does not declare port "${edge}".`);
}

function oppositeEdge(edge: ComponentTransitEdge): ComponentTransitEdge {
  switch (edge) {
    case "north": return "south";
    case "east": return "west";
    case "south": return "north";
    case "west": return "east";
  }
}
