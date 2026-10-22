/**
 * Shared authoritative facts for a pearl traversing one component.
 * Worlds may add pearl identity and source metadata; these facts remain stable across
 * dispatcher, transfer, and future switch-driven transit systems.
 */
export type ComponentTransitDirection = "forward" | "back";
export type ComponentTransitEdge = "north" | "east" | "south" | "west";

export type ComponentTransitState = {
  currentComponentId: string;
  entryEdge: ComponentTransitEdge;
  previousEdge: ComponentTransitEdge;
  direction: ComponentTransitDirection;
  /** Distance from the current component entry in core grid units (0..component.length). */
  localProgress: number;
};
