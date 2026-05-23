import {
  createWheelTransferWorld,
  getWheelTransferSnapshot,
  rotateTransferWheelClockwise,
  transferBallFromWheel,
  type WheelTransferEvent
} from "../../core/board/wheelTransferWorld";

export type WheelTransferControllerConfig = Readonly<{
  topWheelId: string;
  bottomWheelId: string;
  wheelSlotCount: number;
  topConnectedWorldSlotIndex?: number;
  bottomConnectedWorldSlotIndex?: number;
  initialBallWheelId?: string;
  initialBallWheelIds?: readonly string[];
}>;

export type TransferAnimationInstruction = Readonly<{
  type: "transfer" | "bounce";
  ballId: string;
  fromWheelId: string;
  toWheelId: string;
  sourceLocalSlotIndex: number;
  targetLocalSlotIndex: number;
}>;

export type TransferWheelAnimationInstruction = Readonly<{
  wheelId: string;
  targetAngle: number;
  targetRotation: number;
  rotationStep: number;
}>;

export type WheelTransferDebugSnapshot = Readonly<{
  tick: number;
  ballId: string;
  blockingBallId: string;
  topWheelId: string;
  bottomWheelId: string;
  wheels: Readonly<Record<string, {
    id: string;
    hasBall: boolean;
    ballLocalSlotIndex: number | null;
    slots: readonly ({ id: string; color: "red" | "green" | "blue" } | null)[];
    slotBallIds: readonly (string | null)[];
    rotationStep: number;
    connectedWorldSlotIndex: number;
    targetAngle: number;
    pendingTurns: number;
    isAnimating: boolean;
  }>>;
  transitInProgress: boolean;
  lastEvents: readonly WheelTransferEvent[];
}>;

function toAngle(rotationStep: number, slotCount: number): number {
  return rotationStep * (360 / slotCount);
}

function toRotation(angle: number): number {
  return (angle * Math.PI) / 180;
}

export class WheelTransferController {
  private readonly wheelSlotCount: number;
  private readonly world;
  private readonly pendingTurns = new Map<string, number>();
  private readonly isWheelAnimating = new Map<string, boolean>();
  private readonly visualAngles = new Map<string, number>();
  private isTransitAnimating = false;

  constructor(config: WheelTransferControllerConfig) {
    this.wheelSlotCount = config.wheelSlotCount;
    this.world = createWheelTransferWorld(config);

    for (const wheelId of [config.topWheelId, config.bottomWheelId]) {
      this.pendingTurns.set(wheelId, 0);
      this.isWheelAnimating.set(wheelId, false);
      this.visualAngles.set(wheelId, 0);
    }
  }

  requestTransfer(sourceWheelId: string): TransferAnimationInstruction | null {
    if (this.isTransitAnimating || this.hasAnimatingWheel()) {
      return null;
    }

    const events = transferBallFromWheel(this.world, sourceWheelId);
    const transferEvent = events.find((event) => event.type === "BALL_TRANSFERRED");
    const bounceEvent = events.find((event) => event.type === "BALL_BOUNCED");

    if (bounceEvent) {
      this.isTransitAnimating = true;
      return {
        type: "bounce",
        ballId: bounceEvent.ballId,
        fromWheelId: bounceEvent.fromWheelId,
        toWheelId: bounceEvent.toWheelId,
        sourceLocalSlotIndex: bounceEvent.sourceLocalSlotIndex,
        targetLocalSlotIndex: bounceEvent.targetLocalSlotIndex
      };
    }

    if (!transferEvent) {
      return null;
    }

    this.isTransitAnimating = true;
    return {
      type: "transfer",
      ballId: transferEvent.ballId,
      fromWheelId: transferEvent.fromWheelId,
      toWheelId: transferEvent.toWheelId,
      sourceLocalSlotIndex: transferEvent.sourceLocalSlotIndex,
      targetLocalSlotIndex: transferEvent.targetLocalSlotIndex
    };
  }

  completeTransferAnimation(): void {
    this.isTransitAnimating = false;
  }

  requestRotateWheel(wheelId: string): TransferWheelAnimationInstruction | null {
    if (this.isTransitAnimating || !this.world.wheels[wheelId]) {
      return null;
    }

    this.pendingTurns.set(wheelId, (this.pendingTurns.get(wheelId) ?? 0) + 1);
    return this.startNextTurn(wheelId);
  }

  completeWheelAnimation(wheelId: string): TransferWheelAnimationInstruction | null {
    this.isWheelAnimating.set(wheelId, false);
    return this.startNextTurn(wheelId);
  }

  getSnapshot(): WheelTransferDebugSnapshot {
    const snapshot = getWheelTransferSnapshot(this.world);
    const wheels = Object.fromEntries(
      Object.entries(snapshot.wheels).map(([wheelId, wheel]) => [
        wheelId,
        {
          ...wheel,
          hasBall: wheel.ballLocalSlotIndex !== null,
          targetAngle: this.visualAngles.get(wheelId) ?? 0,
          pendingTurns: this.pendingTurns.get(wheelId) ?? 0,
          isAnimating: this.isWheelAnimating.get(wheelId) ?? false
        }
      ])
    ) as WheelTransferDebugSnapshot["wheels"];

    return {
      tick: snapshot.tick,
      ballId: snapshot.ballId,
      blockingBallId: snapshot.blockingBallId,
      topWheelId: snapshot.topWheelId,
      bottomWheelId: snapshot.bottomWheelId,
      wheels,
      transitInProgress: this.isTransitAnimating,
      lastEvents: snapshot.lastEvents
    };
  }

  private startNextTurn(wheelId: string): TransferWheelAnimationInstruction | null {
    if (this.isWheelAnimating.get(wheelId) || (this.pendingTurns.get(wheelId) ?? 0) === 0) {
      return null;
    }

    this.pendingTurns.set(wheelId, (this.pendingTurns.get(wheelId) ?? 0) - 1);
    const events = rotateTransferWheelClockwise(this.world, wheelId, 1);
    const rotateEvent = events.find((event) => event.type === "WHEEL_ROTATED");

    if (!rotateEvent) {
      this.pendingTurns.set(wheelId, 0);
      return null;
    }

    this.isWheelAnimating.set(wheelId, true);
    const visualAngle = (this.visualAngles.get(wheelId) ?? 0) + toAngle(1, this.wheelSlotCount);
    this.visualAngles.set(wheelId, visualAngle);

    return {
      wheelId,
      targetAngle: visualAngle,
      targetRotation: toRotation(visualAngle),
      rotationStep: rotateEvent.rotationStep
    };
  }

  private hasAnimatingWheel(): boolean {
    return [...this.isWheelAnimating.values()].some(Boolean);
  }
}
