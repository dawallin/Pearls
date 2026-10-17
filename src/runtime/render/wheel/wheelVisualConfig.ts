export const WHEEL_TURN_DURATION_MS = 210;
export const WHEEL_TURN_EASE = "Cubic.Out";
export { WHEEL_SLOT_CENTER_RADIUS_FACTOR } from "../../../core/geometry/physicalGeometry";

export function slotIndexToLocalAngle(
  localSlotIndex: number,
  slotCount: number
): number {
  return ((localSlotIndex % slotCount) / slotCount) * Math.PI * 2 - Math.PI / 2;
}
