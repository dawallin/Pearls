import Phaser from "phaser";

import type { WheelAnimationInstruction as BoardWheelAnimationInstruction } from "../../game/DispatchBoardController";
import type { WheelAnimationInstruction as SingleWheelAnimationInstruction } from "../../game/WheelController";
import { PEARL_DIAMETER_FACTOR, PEARL_KEY } from "../pearl/pearlAssets";
import { WHEEL_KEY } from "./wheelAssets";
import {
  slotIndexToLocalAngle,
  WHEEL_SLOT_CENTER_RADIUS_FACTOR,
  WHEEL_TURN_DURATION_MS,
  WHEEL_TURN_EASE
} from "./wheelVisualConfig";

export type WheelViewAnimationInstruction =
  | BoardWheelAnimationInstruction
  | SingleWheelAnimationInstruction;

export type WheelViewConfig = Readonly<{
  x: number;
  y: number;
  size: number;
  slotCount: number;
  onPressed: () => void;
  hasBall?: boolean;
  ballLocalSlotIndex?: number | null;
}>;

export class WheelView {
  private readonly scene: Phaser.Scene;
  private readonly slotCount: number;
  private readonly balls: Phaser.GameObjects.Image[];
  private readonly assembly: Phaser.GameObjects.Container;
  private readonly ballRadius: number;
  private occupiedSlots: readonly boolean[];

  constructor(scene: Phaser.Scene, config: WheelViewConfig) {
    this.scene = scene;
    this.slotCount = config.slotCount;
    this.occupiedSlots = Array.from({ length: config.slotCount }, (_, index) =>
      Boolean(config.hasBall ?? true) && index === (config.ballLocalSlotIndex ?? 0)
    );

    const wheel = scene.add.image(0, 0, WHEEL_KEY);
    this.assembly = scene.add.container(config.x, config.y, [wheel]);
    const wheelScale = config.size / wheel.width;
    const ballSize = wheel.width * PEARL_DIAMETER_FACTOR * wheelScale;

    wheel.setScale(wheelScale);
    this.balls = Array.from({ length: config.slotCount }, () => {
      const ball = scene.add.image(0, 0, PEARL_KEY);
      ball.setScale(ballSize / ball.width);
      scene.children.bringToTop(ball);
      return ball;
    });
    this.ballRadius = wheel.width * WHEEL_SLOT_CENTER_RADIUS_FACTOR * wheelScale;
    wheel.setInteractive({ useHandCursor: true });
    wheel.on("pointerdown", config.onPressed);

    this.syncBallPose();
  }

  get x(): number {
    return this.assembly.x;
  }

  get y(): number {
    return this.assembly.y;
  }

  get rotation(): number {
    return this.assembly.rotation;
  }

  setBallState(state: { hasBall: boolean; localSlotIndex: number | null }): void {
    this.occupiedSlots = Array.from({ length: this.slotCount }, (_, index) =>
      state.hasBall && index === state.localSlotIndex
    );
    this.syncBallPose();
  }

  setWheelSlots(slots: readonly (string | null)[]): void {
    this.occupiedSlots = Array.from({ length: this.slotCount }, (_, index) =>
      Boolean(slots[index])
    );
    this.syncBallPose();
  }

  setBallVisible(visible: boolean): void {
    for (const ball of this.balls) {
      ball.setVisible(visible && ball.visible);
    }
  }

  getBallScale(): number {
    return this.balls[0]?.scaleX ?? 1;
  }

  getBallWorldPosition(localSlotIndex?: number | null): { x: number; y: number } | null {
    this.syncBallPose();
    const slotIndex =
      localSlotIndex ?? this.occupiedSlots.findIndex((isOccupied) => isOccupied);

    if (slotIndex === null || slotIndex < 0) {
      return null;
    }

    const ball = this.balls[slotIndex];

    if (!ball) {
      return null;
    }

    return {
      x: ball.x,
      y: ball.y
    };
  }

  animateTurn(
    _instruction: WheelViewAnimationInstruction,
    onComplete: () => WheelViewAnimationInstruction | null
  ): void {
    const turnRadians = (Math.PI * 2) / this.slotCount;

    this.scene.tweens.add({
      targets: this.assembly,
      rotation: this.assembly.rotation + turnRadians,
      duration: WHEEL_TURN_DURATION_MS,
      ease: WHEEL_TURN_EASE,
      onUpdate: () => {
        this.syncBallPose();
      },
      onComplete: () => {
        this.syncBallPose();
        const nextInstruction = onComplete();

        if (nextInstruction) {
          this.animateTurn(nextInstruction, onComplete);
        }
      }
    });
  }

  private syncBallPose(): void {
    for (let localSlotIndex = 0; localSlotIndex < this.slotCount; localSlotIndex += 1) {
      const ball = this.balls[localSlotIndex];

      if (!ball) {
        continue;
      }

      const angle =
        slotIndexToLocalAngle(localSlotIndex, this.slotCount) + this.assembly.rotation;

      ball.setPosition(
        this.assembly.x + Math.cos(angle) * this.ballRadius,
        this.assembly.y + Math.sin(angle) * this.ballRadius
      );
      ball.setVisible(Boolean(this.occupiedSlots[localSlotIndex]));
    }
  }
}
