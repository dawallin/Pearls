import {
  advanceDispatchBoardTime,
  createDispatchBoardWorld,
  dispatchBall,
  getDispatchBoardSnapshot,
  rotateWheelClockwise,
  type DispatchBoardEvent
} from "../../core/board/dispatchBoardWorld";

export type DispatchBoardControllerConfig = Readonly<{
  dispatcherId?: string;
  slideId?: string;
  dispatchers?: readonly {
    id: string;
    slideId: string;
    hasInitialBall?: boolean;
    initialBall?: {
      id?: string;
      color: "red" | "green" | "blue";
    };
    refillQueue?: readonly {
      id?: string;
      color: "red" | "green" | "blue";
      delayMs: number;
    }[];
    connectedWorldSlotIndex?: number;
  }[];
  wheelId: string;
  wheelSlotCount: number;
  dispatcherHasInitialBall?: boolean;
  initialBall?: {
    id?: string;
    color: "red" | "green" | "blue";
  };
  refillQueue?: readonly {
    id?: string;
    color: "red" | "green" | "blue";
    delayMs: number;
  }[];
}>;

export type DispatchAnimationInstruction = Readonly<{
  dispatcherId: string;
  slideId: string;
  wheelId: string;
  targetLocalSlotIndex: number;
  ball: {
    id: string;
    color: "red" | "green" | "blue";
  };
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
    ball: {
      id: string;
      color: "red" | "green" | "blue";
    } | null;
  }>;
  dispatchers: readonly Readonly<{
    id: string;
    slideId: string;
    hasBall: boolean;
    ball: {
      id: string;
      color: "red" | "green" | "blue";
    } | null;
    connectedWorldSlotIndex: number;
  }>[];
  slide: Readonly<{
    id: string;
  }>;
  wheel: Readonly<{
    id: string;
    hasBall: boolean;
    ballLocalSlotIndex: number | null;
    slots: readonly ({ id: string; color: "red" | "green" | "blue" } | null)[];
    slotBallIds: readonly (string | null)[];
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

  requestDispatch(dispatcherId?: string): DispatchAnimationInstruction | null {
    if (this.isTransitAnimating || this.isWheelAnimating) {
      return null;
    }

    const events = dispatchBall(this.world, dispatcherId);

    if (events.length === 0) {
      return null;
    }

    const dispatchEvent = events.find((event) => event.type === "BALL_DISPATCHED");
    const landedEvent = events.find((event) => event.type === "BALL_LANDED_IN_WHEEL");

    if (!dispatchEvent || !landedEvent) {
      return null;
    }

    this.isTransitAnimating = true;
    return {
      dispatcherId: dispatchEvent.dispatcherId,
      slideId: dispatchEvent.slideId,
      wheelId: this.world.wheel.id,
      targetLocalSlotIndex: landedEvent.localSlotIndex,
      ball: {
        id: dispatchEvent.ballId,
        color: dispatchEvent.color
      }
    };
  }

  completeDispatchAnimation(): void {
    this.isTransitAnimating = false;
  }

  advanceTime(deltaMs: number): readonly DispatchBoardEvent[] {
    return advanceDispatchBoardTime(this.world, deltaMs);
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
      dispatchers: snapshot.dispatchers,
      slide: snapshot.slide,
      wheel: {
        id: snapshot.wheel.id,
        hasBall: snapshot.wheel.ballLocalSlotIndex !== null,
        ballLocalSlotIndex: snapshot.wheel.ballLocalSlotIndex,
        slots: snapshot.wheel.slots,
        slotBallIds: snapshot.wheel.slotBallIds,
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
