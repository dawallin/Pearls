import {
  createDispatchBoardWorld,
  dispatchBall,
  getDispatchBoardSnapshot,
  rotateWheelClockwise,
  type DispatchBoardEvent
} from "../../core/board/dispatchBoardWorld";

export type DispatchBoardControllerConfig = Readonly<{
  dispatcherId: string;
  slideId: string;
  wheelId: string;
  wheelSlotCount: number;
  dispatcherHasInitialBall?: boolean;
}>;

export type DispatchAnimationInstruction = Readonly<{
  dispatcherId: string;
  slideId: string;
  wheelId: string;
}>;

export type WheelAnimationInstruction = Readonly<{
  wheelId: string;
  targetAngle: number;
  targetRotation: number;
  rotationStep: number;
}>;

export type DispatchBoardDebugSnapshot = Readonly<{
  tick: number;
  dispatcher: Readonly<{
    id: string;
    hasBall: boolean;
  }>;
  slide: Readonly<{
    id: string;
  }>;
  wheel: Readonly<{
    id: string;
    hasBall: boolean;
    ballLocalSlotIndex: number | null;
    slots: readonly (string | null)[];
    rotationStep: number;
    targetAngle: number;
    pendingTurns: number;
    isAnimating: boolean;
  }>;
  transitInProgress: boolean;
  lastEvents: readonly DispatchBoardEvent[];
}>;

function toAngle(rotationStep: number, slotCount: number): number {
  return rotationStep * (360 / slotCount);
}

function toRotation(angle: number): number {
  return (angle * Math.PI) / 180;
}

export class DispatchBoardController {
  private readonly wheelSlotCount: number;
  private readonly world;
  private pendingTurns = 0;
  private isWheelAnimating = false;
  private isTransitAnimating = false;
  private targetAngle = 0;
  private visualAngle = 0;

  constructor(config: DispatchBoardControllerConfig) {
    this.wheelSlotCount = config.wheelSlotCount;
    this.world = createDispatchBoardWorld(config);
  }

  requestDispatch(): DispatchAnimationInstruction | null {
    if (this.isTransitAnimating || this.isWheelAnimating) {
      return null;
    }

    const events = dispatchBall(this.world);

    if (events.length === 0) {
      return null;
    }

    this.isTransitAnimating = true;
    return {
      dispatcherId: this.world.dispatcher.id,
      slideId: this.world.slide.id,
      wheelId: this.world.wheel.id
    };
  }

  completeDispatchAnimation(): void {
    this.isTransitAnimating = false;
  }

  requestRotateWheel(): WheelAnimationInstruction | null {
    if (this.isTransitAnimating) {
      return null;
    }

    this.pendingTurns += 1;
    return this.startNextTurn();
  }

  completeWheelAnimation(): WheelAnimationInstruction | null {
    this.isWheelAnimating = false;
    return this.startNextTurn();
  }

  getSnapshot(): DispatchBoardDebugSnapshot {
    const snapshot = getDispatchBoardSnapshot(this.world);

    return {
      tick: snapshot.tick,
      dispatcher: snapshot.dispatcher,
      slide: snapshot.slide,
      wheel: {
        id: snapshot.wheel.id,
        hasBall: snapshot.wheel.ballLocalSlotIndex !== null,
        ballLocalSlotIndex: snapshot.wheel.ballLocalSlotIndex,
        slots: snapshot.wheel.slots,
        rotationStep: snapshot.wheel.rotationStep,
        targetAngle: this.targetAngle,
        pendingTurns: this.pendingTurns,
        isAnimating: this.isWheelAnimating
      },
      transitInProgress: this.isTransitAnimating,
      lastEvents: snapshot.lastEvents
    };
  }

  private startNextTurn(): WheelAnimationInstruction | null {
    if (this.isWheelAnimating || this.pendingTurns === 0) {
      return null;
    }

    this.pendingTurns -= 1;
    const events = rotateWheelClockwise(this.world, 1);

    if (events.length === 0) {
      this.pendingTurns = 0;
      return null;
    }

    this.isWheelAnimating = true;
    this.visualAngle += toAngle(1, this.wheelSlotCount);
    this.targetAngle = this.visualAngle;

    return {
      wheelId: this.world.wheel.id,
      targetAngle: this.targetAngle,
      targetRotation: toRotation(this.targetAngle),
      rotationStep: this.world.wheel.rotationStep
    };
  }
}
