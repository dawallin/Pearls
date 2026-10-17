/**
 * Shared authoritative facts for a pearl traversing one component.
 * Worlds may add route or endpoint data, but these facts remain stable across
 * dispatcher, transfer, and future switch-driven transit systems.
 */
export type ComponentTransitDirection = "forward" | "back";
export type ComponentTransitEdge = "north" | "east" | "south" | "west";

export type ComponentTransitState = {
  currentComponentId: string;
  entryEdge: ComponentTransitEdge;
  previousEdge: ComponentTransitEdge;
  direction: ComponentTransitDirection;
  localProgress: number;
};
