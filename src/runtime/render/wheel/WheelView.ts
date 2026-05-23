import Phaser from "phaser";

import type { BallState } from "../../../core/ball/ballState";
import type { WheelAnimationInstruction as BoardWheelAnimationInstruction } from "../../game/DispatchBoardController";
import type { TransferWheelAnimationInstruction } from "../../game/WheelTransferController";
import type { WheelAnimationInstruction as SingleWheelAnimationInstruction } from "../../game/WheelController";
import { PEARL_DIAMETER_FACTOR, getPearlTextureKey } from "../pearl/pearlAssets";
import { WHEEL_KEY } from "./wheelAssets";
import {
  slotIndexToLocalAngle,
  WHEEL_SLOT_CENTER_RADIUS_FACTOR,
  WHEEL_TURN_DURATION_MS,
  WHEEL_TURN_EASE
} from "./wheelVisualConfig";

const WHEEL_CENTER_HIT_RADIUS_FACTOR = 0.28;

export type WheelViewAnimationInstruction =
  | BoardWheelAnimationInstruction
  | SingleWheelAnimationInstruction
  | TransferWheelAnimationInstruction;

export type WheelViewConfig = Readonly<{
  x: number;
  y: number;
  size: number;
  slotCount: number;
  onPressed: () => void;
  onBallPressed?: (localSlotIndex: number) => void;
  hasBall?: boolean;
  ballLocalSlotIndex?: number | null;
  slots?: readonly (BallState | null)[];
}>;

export class WheelView {
  private readonly scene: Phaser.Scene;
  private readonly slotCount: number;
  private readonly balls: Phaser.GameObjects.Image[];
  private readonly assembly: Phaser.GameObjects.Container;
  private readonly ballRadius: number;
  private slots: readonly (BallState | null)[];

  constructor(scene: Phaser.Scene, config: WheelViewConfig) {
    this.scene = scene;
    this.slotCount = config.slotCount;
    this.slots =
      config.slots ??
      Array.from({ length: config.slotCount }, (_, index) =>
        Boolean(config.hasBall ?? true) && index === (config.ballLocalSlotIndex ?? 0)
          ? { id: "legacy-ball", color: "red" }
          : null
      );

    const wheel = scene.add.image(0, 0, WHEEL_KEY);
    this.assembly = scene.add.container(config.x, config.y, [wheel]);
    const wheelScale = config.size / wheel.width;
    const ballSize = wheel.width * PEARL_DIAMETER_FACTOR * wheelScale;

    wheel.setScale(wheelScale);
    const centerHitRadius = wheel.width * WHEEL_CENTER_HIT_RADIUS_FACTOR;
    wheel.setInteractive(
      new Phaser.Geom.Circle(wheel.width / 2, wheel.height / 2, centerHitRadius),
      Phaser.Geom.Circle.Contains
    );
    wheel.on("pointerdown", config.onPressed);
    this.balls = Array.from({ length: config.slotCount }, () => {
      const ball = scene.add.image(0, 0, getPearlTextureKey("red"));
      ball.setScale(ballSize / ball.width);
      ball.setInteractive({ useHandCursor: true });
      ball.on("pointerdown", () => {
        const localSlotIndex = this.balls.indexOf(ball);

        if (localSlotIndex >= 0 && this.slots[localSlotIndex]) {
          config.onBallPressed?.(localSlotIndex);
        }
      });
      scene.children.bringToTop(ball);
      return ball;
    });
    this.ballRadius = wheel.width * WHEEL_SLOT_CENTER_RADIUS_FACTOR * wheelScale;

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
    this.slots = Array.from({ length: this.slotCount }, (_, index) =>
      state.hasBall && index === state.localSlotIndex
        ? { id: "legacy-ball", color: "red" }
        : null
    );
    this.syncBallPose();
  }

  setWheelSlots(slots: readonly (BallState | null)[]): void {
    this.slots = slots;
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

  getBallVisualRadius(): number {
    return (this.balls[0]?.displayWidth ?? 0) / 2;
  }

  getBallWorldPosition(localSlotIndex?: number | null): { x: number; y: number } | null {
    this.syncBallPose();
    const slotIndex =
      localSlotIndex ?? this.slots.findIndex((ball) => ball !== null);

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
      const slotBall = this.slots[localSlotIndex];

      if (slotBall) {
        ball.setTexture(getPearlTextureKey(slotBall.color));
      }

      ball.setPosition(
        this.assembly.x + Math.cos(angle) * this.ballRadius,
        this.assembly.y + Math.sin(angle) * this.ballRadius
      );
      ball.setVisible(slotBall !== null);
    }
  }
}
