import {
  createWheelWorld,
  enqueueRotateWheel,
  getWheelWorldSnapshot,
  tickWheelWorld,
  type WheelEvent
} from "../../core/wheel/wheelWorld";

export type WheelControllerConfig = Readonly<{
  wheelId: string;
  slotCount: number;
}>;

export type WheelAnimationInstruction = Readonly<{
  wheelId: string;
  targetAngle: number;
  targetRotation: number;
  rotationStep: number;
}>;

export type WheelDebugSnapshot = Readonly<{
  wheelId: string;
  tick: number;
  rotationStep: number;
  targetAngle: number;
  visualRotation: number;
  pendingTurns: number;
  isAnimating: boolean;
  lastEvents: readonly WheelEvent[];
}>;

function toAngle(rotationStep: number, slotCount: number): number {
  return rotationStep * (360 / slotCount);
}

function toRotation(angle: number): number {
  return (angle * Math.PI) / 180;
}

export class WheelController {
  private readonly wheelId: string;
  private readonly slotCount: number;
  private readonly world;
  private pendingTurns = 0;
  private isAnimating = false;
  private targetAngle = 0;
  private visualAngle = 0;

  constructor(config: WheelControllerConfig) {
    this.wheelId = config.wheelId;
    this.slotCount = config.slotCount;
    this.world = createWheelWorld([
      {
        id: config.wheelId,
        slotCount: config.slotCount
      }
    ]);
  }

  requestRotateTurn(): WheelAnimationInstruction | null {
    this.pendingTurns += 1;
    return this.startNextTurn();
  }

  completeAnimation(): WheelAnimationInstruction | null {
    this.isAnimating = false;
    return this.startNextTurn();
  }

  getSnapshot(currentVisualRotation = toRotation(this.visualAngle)): WheelDebugSnapshot {
    const snapshot = getWheelWorldSnapshot(this.world);
    const wheel = snapshot.wheels[this.wheelId];

    return {
      wheelId: this.wheelId,
      tick: snapshot.tick,
      rotationStep: wheel.rotationStep,
      targetAngle: this.targetAngle,
      visualRotation: currentVisualRotation,
      pendingTurns: this.pendingTurns,
      isAnimating: this.isAnimating,
      lastEvents: snapshot.lastEvents
    };
  }

  private startNextTurn(): WheelAnimationInstruction | null {
    if (this.isAnimating || this.pendingTurns === 0) {
      return null;
    }

    this.pendingTurns -= 1;
    enqueueRotateWheel(this.world, this.wheelId, 1);
    tickWheelWorld(this.world);

    const snapshot = getWheelWorldSnapshot(this.world);
    const wheel = snapshot.wheels[this.wheelId];

    this.isAnimating = true;
    this.visualAngle += toAngle(1, this.slotCount);
    this.targetAngle = this.visualAngle;

    return {
      wheelId: this.wheelId,
      targetAngle: this.targetAngle,
      targetRotation: toRotation(this.targetAngle),
      rotationStep: wheel.rotationStep
    };
  }
}
