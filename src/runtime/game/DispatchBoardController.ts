import {
  advanceDispatchBoardTime,
  createDispatchBoardWorld,
  dispatchBall,
  ejectBallFromWheel,
  getDispatchBoardSnapshot,
  rotateWheelClockwise,
  type DispatchBoardEvent,
  type DispatchTransitSnapshot
} from "../../core/board/dispatchBoardWorld";
import type { WheelClearRule } from "../../core/wheel/wheelClearRule";
import type { ComponentTransitSegment, DispatcherTransitSegment } from "../../core/board/componentTransitRoute";
import type { ComponentConnectionOption } from "../../core/board/componentConnectionState";
import type { GridLevelDefinition } from "../../core/level/gridLevel";

export type DispatchBoardControllerConfig = Readonly<{
  level?: GridLevelDefinition;
  connectionOptions?: readonly ComponentConnectionOption[];
  dispatcherId?: string;
  slideId?: string;
  dispatchers?: readonly {
    id: string;
    slideId?: string;
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
    entryEdge?: "north" | "east" | "south" | "west";
    transitSegment?: DispatcherTransitSegment;
    transitSegments?: readonly ComponentTransitSegment[];
  }[];
  wheelId: string;
  wheelSlotCount: number;
  transitTravelMs?: number;
  wheelClearRule?: WheelClearRule;
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
  ball: {
    id: string;
    color: "red" | "green" | "blue";
  };
  /** Landing and clear are core events observed from snapshots, never animation results. */
  clearEvent?: Extract<DispatchBoardEvent, { type: "WHEEL_CLEARED" }>;
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
    clearRule: WheelClearRule | undefined;
    clearCount: number;
    lastClearEvent: Extract<DispatchBoardEvent, { type: "WHEEL_CLEARED" }> | null;
    rotationStep: number;
    targetAngle: number;
    pendingTurns: number;
    isAnimating: boolean;
  }>;
  transitInProgress: boolean;
  activeTransits: readonly DispatchTransitSnapshot[];
  lastHandoffEvent: Extract<DispatchBoardEvent, { type: "TRANSIT_HANDOFF" }> | null;
  lastBounceEvent: Extract<DispatchBoardEvent, { type: "BALL_BOUNCED" }> | null;
  lastBurnEvent: Extract<DispatchBoardEvent, { type: "BALL_BURNED_AT_DISPATCHER" }> | null;
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
  private targetAngle = 0;
  private visualAngle = 0;

  constructor(config: DispatchBoardControllerConfig) {
    this.wheelSlotCount = config.wheelSlotCount;
    this.world = createDispatchBoardWorld(config);
  }

  requestDispatch(dispatcherId?: string): DispatchAnimationInstruction | null {
    if (this.isWheelAnimating) {
      return null;
    }

    const request = dispatchBall(this.world, dispatcherId);
    if (!request) {
      return null;
    }

    return {
      dispatcherId: request.dispatcherId,
      slideId: request.slideId,
      ball: {
        id: request.ball.id,
        color: request.ball.color
      }
    };
  }

  requestWheelEjection(localSlotIndex: number): Readonly<{ wheelId: string; ball: { id: string; color: "red" | "green" | "blue" } }> | null {
    return ejectBallFromWheel(this.world, localSlotIndex);
  }

  completeDispatchAnimation(): void {
    // Presentation completion is intentionally not authoritative.
  }

  advanceTime(deltaMs: number): readonly DispatchBoardEvent[] {
    return advanceDispatchBoardTime(this.world, deltaMs);
  }

  requestRotateWheel(): WheelAnimationInstruction | null {
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
        clearRule: snapshot.wheel.clearRule,
        clearCount: snapshot.wheel.clearCount,
        lastClearEvent: snapshot.wheel.lastClearEvent,
        rotationStep: snapshot.wheel.rotationStep,
        targetAngle: this.targetAngle,
        pendingTurns: this.pendingTurns,
        isAnimating: this.isWheelAnimating
      },
      transitInProgress: snapshot.activeTransits.length > 0 || snapshot.pendingTransitCount > 0,
      activeTransits: snapshot.activeTransits,
      lastHandoffEvent: snapshot.lastHandoffEvent,
      lastBounceEvent: snapshot.lastBounceEvent,
      lastBurnEvent: snapshot.lastBurnEvent,
      lastEvents: snapshot.lastEvents
    };
  }

  private startNextTurn(): WheelAnimationInstruction | null {
    if (this.isWheelAnimating || this.pendingTurns === 0) {
      return null;
    }

    this.pendingTurns -= 1;
    const request = rotateWheelClockwise(this.world, 1);

    if (!request) {
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
      rotationStep: request.rotationStep
    };
  }
}
