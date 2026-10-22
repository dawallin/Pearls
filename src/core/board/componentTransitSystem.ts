import { PEARL_DIAMETER_GRID_UNITS } from "../geometry/physicalGeometry";
import { resolveComponentConnection, type ComponentConnectionEndpoint, type ComponentConnectionState } from "./componentConnectionState";
import type { ComponentTransitSegment, CorePoint } from "./componentTransitRoute";
import type { ComponentTransitEdge, ComponentTransitState } from "./componentTransitState";

type Terminal = Exclude<ComponentConnectionEndpoint, { kind: "component" }>;
export type ComponentTransitHost<T extends ComponentTransitState> = {
  transits(): readonly T[];
  id(transit: T): string;
  getSegment(id: string): ComponentTransitSegment;
  connections: ComponentConnectionState;
  speed: number;
  terminalClearance(transit: T, endpoint: Terminal): number;
  onTerminal(transit: T, endpoint: Terminal): void;
  onHandoff(transit: T, from: string, edge: ComponentTransitEdge, endpoint: ComponentConnectionEndpoint): void;
  onCollision(first: T, second: T): void;
};

const EPSILON = 1e-8;

/** Advances all component-owned transits on one shared timeline. Progress is distance in grid units.
 * Each port handoff or contact splits the tick, so no future terminal effect needs to be undone.
 */
export function advanceComponentTransits<T extends ComponentTransitState>(host: ComponentTransitHost<T>, deltaMs: number): void {
  let remaining = deltaMs;
  let iterations = 0;
  while (true) {
    if (++iterations > 100_000) throw new Error("Transit timeline did not converge.");
    const transits = [...host.transits()].sort((a, b) => host.id(a).localeCompare(host.id(b)));
    const boundaries = transits.map((transit) => {
      const segment = host.getSegment(transit.currentComponentId);
      const edge = transit.direction === "forward" ? segment.exitEdge : segment.entryEdge;
      const endpoint = resolveComponentConnection(host.connections, segment.componentId, edge);
      const distance = transit.direction === "forward" ? segment.length - transit.localProgress : transit.localProgress;
      const clearance = endpoint.kind === "component" ? 0 : host.terminalClearance(transit, endpoint);
      return { transit, edge, endpoint, time: Math.max(0, distance - clearance) / host.speed };
    });
    let horizon = remaining;
    for (const boundary of boundaries) horizon = Math.min(horizon, boundary.time);
    const contacts: Array<{ first: T; second: T; time: number }> = [];
    for (let i = 0; i < transits.length; i += 1) {
      for (let j = i + 1; j < transits.length; j += 1) {
        const first = transits[i], second = transits[j];
        // Only the owning component and its connected neighbours participate in contact checks.
        if (!shareBoundary(host, first.currentComponentId, second.currentComponentId)) continue;
        const time = contactTime(host, first, second);
        if (time !== null && time <= horizon + EPSILON) contacts.push({ first, second, time: Math.min(time, horizon) });
      }
    }
    contacts.sort((a, b) => a.time - b.time || host.id(a.first).localeCompare(host.id(b.first)) || host.id(a.second).localeCompare(host.id(b.second)));
    const contact = contacts[0];
    const boundary = boundaries.filter((item) => item.time <= remaining + EPSILON)
      .sort((a, b) => a.time - b.time || host.id(a.transit).localeCompare(host.id(b.transit)))[0];
    const elapsed = contact ? contact.time : boundary ? Math.min(boundary.time, remaining) : remaining;
    for (const transit of transits) {
      const segment = host.getSegment(transit.currentComponentId);
      const distance = host.speed * elapsed * (transit.direction === "forward" ? 1 : -1);
      transit.localProgress = Math.max(0, Math.min(segment.length, transit.localProgress + distance));
    }
    remaining = Math.max(0, remaining - elapsed);
    if (contact) {
      reverse(contact.first);
      reverse(contact.second);
      host.onCollision(contact.first, contact.second);
    } else if (boundary) {
      const { transit, endpoint, edge } = boundary;
      const from = transit.currentComponentId;
      if (endpoint.kind === "component") {
        const next = host.getSegment(endpoint.componentId);
        transit.previousEdge = edge;
        transit.entryEdge = endpoint.entryEdge;
        transit.currentComponentId = next.componentId;
        if (endpoint.entryEdge === next.entryEdge) { transit.direction = "forward"; transit.localProgress = 0; }
        else if (endpoint.entryEdge === next.exitEdge) { transit.direction = "back"; transit.localProgress = next.length; }
        else throw new Error(`Invalid entry port for component "${next.componentId}".`);
        host.onHandoff(transit, from, edge, endpoint);
      } else host.onTerminal(transit, endpoint);
    } else return;
  }
}

function reverse(transit: ComponentTransitState): void {
  transit.direction = transit.direction === "forward" ? "back" : "forward";
}

function shareBoundary<T extends ComponentTransitState>(host: ComponentTransitHost<T>, first: string, second: string): boolean {
  if (first === second) return true;
  return [first, second].some((id, index) => {
    const segment = host.getSegment(id);
    return [segment.entryEdge, segment.exitEdge].some((edge) => {
      const endpoint = resolveComponentConnection(host.connections, id, edge);
      return endpoint.kind === "component" && endpoint.componentId === (index === 0 ? second : first);
    });
  });
}

function position<T extends ComponentTransitState>(host: ComponentTransitHost<T>, transit: T): CorePoint {
  const segment = host.getSegment(transit.currentComponentId);
  const fraction = transit.localProgress / segment.length;
  return { x: segment.entry.x + (segment.exit.x - segment.entry.x) * fraction, y: segment.entry.y + (segment.exit.y - segment.entry.y) * fraction };
}

function velocity<T extends ComponentTransitState>(host: ComponentTransitHost<T>, transit: T): CorePoint {
  const segment = host.getSegment(transit.currentComponentId);
  const scale = host.speed / segment.length * (transit.direction === "forward" ? 1 : -1);
  return { x: (segment.exit.x - segment.entry.x) * scale, y: (segment.exit.y - segment.entry.y) * scale };
}

function contactTime<T extends ComponentTransitState>(host: ComponentTransitHost<T>, first: T, second: T): number | null {
  const p = position(host, first), q = position(host, second);
  const v = velocity(host, first), w = velocity(host, second);
  // Direction is component-local; physical velocities decide whether two pearls oppose one another.
  if (v.x * w.x + v.y * w.y >= 0) return null;
  const rx = p.x - q.x, ry = p.y - q.y, vx = v.x - w.x, vy = v.y - w.y;
  const closing = rx * vx + ry * vy;
  if (closing >= -EPSILON) return null;
  const a = vx * vx + vy * vy, b = 2 * closing;
  const c = rx * rx + ry * ry - PEARL_DIAMETER_GRID_UNITS ** 2;
  if (c <= EPSILON) return 0;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  return Math.max(0, (-b - Math.sqrt(discriminant)) / (2 * a));
}
