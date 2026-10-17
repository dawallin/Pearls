import {
  advanceWheelTransferWorld,
  createWheelTransferWorld,
  getWheelTransferSnapshot,
  rotateTransferWheelClockwise,
  transferBallFromWheel,
  type WheelTransferConfig,
  type WheelTransferEvent,
  type WheelTransferSnapshot
} from "../../core/board/wheelTransferWorld";

export type WheelTransferControllerConfig = WheelTransferConfig;
export type TransferAnimationInstruction = Readonly<{ type: "transfer"; ballId: string; fromWheelId: string; adjacentComponentId: string; entryEdge: "north" | "east" | "south" | "west"; sourceLocalSlotIndex: number }>;
export type TransferWheelAnimationInstruction = Readonly<{ wheelId: string; targetAngle: number; targetRotation: number; rotationStep: number }>;
export type WheelTransferDebugSnapshot = WheelTransferSnapshot & Readonly<{
  transitInProgress: boolean;
  wheels: Readonly<Record<string, WheelTransferSnapshot["wheels"][string] & { hasBall: boolean; targetAngle: number; pendingTurns: number; isAnimating: boolean }>>;
}>;

function toAngle(rotationStep: number, slotCount: number): number { return rotationStep * (360 / slotCount); }
function toRotation(angle: number): number { return (angle * Math.PI) / 180; }

export class WheelTransferController {
  private readonly world;
  private readonly wheelSlotCount: number;
  private readonly visualAngles = new Map<string, number>();
  private readonly isWheelAnimating = new Map<string, boolean>();

  constructor(config: WheelTransferControllerConfig) {
    this.world = createWheelTransferWorld(config);
    this.wheelSlotCount = config.wheelSlotCount;
    this.visualAngles.set(config.topWheelId, 0);
    this.visualAngles.set(config.bottomWheelId, 0);
    this.isWheelAnimating.set(config.topWheelId, false);
    this.isWheelAnimating.set(config.bottomWheelId, false);
  }

  requestTransfer(sourceWheelId: string): TransferAnimationInstruction | null {
    const request = transferBallFromWheel(this.world, sourceWheelId);
    return request ? { type: "transfer", ...request } : null;
  }

  /** Compatibility no-op: core ticks, rather than animation callbacks, settle transfers. */
  completeTransferAnimation(): void {}

  advanceTime(ticks = 1): readonly WheelTransferEvent[] { return advanceWheelTransferWorld(this.world, ticks); }

  requestRotateWheel(wheelId: string): TransferWheelAnimationInstruction | null {
    if (!this.world.wheels[wheelId] || this.isWheelAnimating.get(wheelId)) return null;
    const request = rotateTransferWheelClockwise(this.world, wheelId, 1);
    if (!request) return null;
    const targetAngle = (this.visualAngles.get(wheelId) ?? 0) + toAngle(1, this.wheelSlotCount);
    this.visualAngles.set(wheelId, targetAngle);
    this.isWheelAnimating.set(wheelId, true);
    return { wheelId, targetAngle, targetRotation: toRotation(targetAngle), rotationStep: request.rotationStep };
  }

  completeWheelAnimation(wheelId: string): TransferWheelAnimationInstruction | null {
    this.isWheelAnimating.set(wheelId, false);
    return null;
  }

  getSnapshot(): WheelTransferDebugSnapshot {
    const snapshot = getWheelTransferSnapshot(this.world);
    const wheels = Object.fromEntries(Object.entries(snapshot.wheels).map(([wheelId, wheel]) => [wheelId, {
      ...wheel,
      hasBall: wheel.ballLocalSlotIndex !== null,
      targetAngle: this.visualAngles.get(wheelId) ?? 0,
      pendingTurns: 0,
      isAnimating: this.isWheelAnimating.get(wheelId) ?? false
    }]));
    return { ...snapshot, wheels, transitInProgress: snapshot.activeTransits.length > 0 || snapshot.pendingLaunchCount > 0 } as WheelTransferDebugSnapshot;
  }
}
