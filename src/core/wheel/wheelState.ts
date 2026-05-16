export type WheelId = string;
export type WheelOccupantId = string;

export type WheelConfig = Readonly<{
  id: WheelId;
  slotCount: number;
  initialRotationStep?: number;
}>;

export type WheelState = Readonly<{
  id: WheelId;
  slotCount: number;
  rotationStep: number;
  slots: readonly (WheelOccupantId | null)[];
}>;

export type MutableWheelState = {
  id: WheelId;
  slotCount: number;
  rotationStep: number;
  slots: Array<WheelOccupantId | null>;
};

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function createWheelState(config: WheelConfig): MutableWheelState {
  if (!Number.isInteger(config.slotCount) || config.slotCount <= 0) {
    throw new Error(`Wheel "${config.id}" must have a positive integer slot count.`);
  }

  return {
    id: config.id,
    slotCount: config.slotCount,
    rotationStep: mod(config.initialRotationStep ?? 0, config.slotCount),
    slots: Array.from({ length: config.slotCount }, () => null)
  };
}

export function worldToLocalSlot(
  worldSlotIndex: number,
  rotationStep: number,
  slotCount: number
): number {
  return mod(worldSlotIndex - rotationStep, slotCount);
}

export function getWheelLocalSlotOccupant(
  wheel: Pick<MutableWheelState, "slotCount" | "slots">,
  localSlotIndex: number
): WheelOccupantId | null {
  return wheel.slots[mod(localSlotIndex, wheel.slotCount)] ?? null;
}

export function getWheelWorldSlotOccupant(
  wheel: Pick<MutableWheelState, "rotationStep" | "slotCount" | "slots">,
  worldSlotIndex: number
): WheelOccupantId | null {
  return getWheelLocalSlotOccupant(
    wheel,
    worldToLocalSlot(worldSlotIndex, wheel.rotationStep, wheel.slotCount)
  );
}

export function setWheelLocalSlotOccupant(
  wheel: Pick<MutableWheelState, "slotCount" | "slots">,
  localSlotIndex: number,
  occupantId: WheelOccupantId | null
): void {
  wheel.slots[mod(localSlotIndex, wheel.slotCount)] = occupantId;
}

export function setWheelWorldSlotOccupant(
  wheel: Pick<MutableWheelState, "rotationStep" | "slotCount" | "slots">,
  worldSlotIndex: number,
  occupantId: WheelOccupantId | null
): number {
  const localSlotIndex = worldToLocalSlot(
    worldSlotIndex,
    wheel.rotationStep,
    wheel.slotCount
  );
  setWheelLocalSlotOccupant(wheel, localSlotIndex, occupantId);
  return localSlotIndex;
}

export function rotateWheelState(
  wheel: Pick<MutableWheelState, "rotationStep" | "slotCount">,
  steps: number
): void {
  if (!Number.isInteger(steps) || steps === 0) {
    throw new Error("Rotate steps must be a non-zero integer.");
  }

  wheel.rotationStep = mod(wheel.rotationStep + steps, wheel.slotCount);
}

export function findWheelOccupantLocalSlotIndex(
  wheel: Pick<MutableWheelState, "slots">,
  occupantId: WheelOccupantId
): number | null {
  const localSlotIndex = wheel.slots.findIndex((slotOccupantId) => slotOccupantId === occupantId);
  return localSlotIndex >= 0 ? localSlotIndex : null;
}

export function getWheelSlotsSnapshot(
  wheel: Pick<MutableWheelState, "slots">
): readonly (WheelOccupantId | null)[] {
  return [...wheel.slots];
}
