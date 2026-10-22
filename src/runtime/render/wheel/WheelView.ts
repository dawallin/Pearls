import Phaser from "phaser";

import type { BallColor, BallState } from "../../../core/ball/ballState";
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
  targetColors?: readonly BallColor[];
}>;

export class WheelView {
  private readonly scene: Phaser.Scene;
  private readonly slotCount: number;
  private readonly balls: Phaser.GameObjects.Image[];
  private readonly targetIndicators: Phaser.GameObjects.Graphics[];
  private readonly assembly: Phaser.GameObjects.Container;
  private readonly ballRadius: number;
  private slots: readonly (BallState | null)[];
  private clearEffectActive = false;
  private clearEffectTargetCount = 0;

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
    this.targetIndicators = config.targetColors?.map((color) => {
      const indicator = scene.add.graphics();
      drawSocketDepth(indicator, getTargetDepthColor(color), ballSize);
      drawTargetU(indicator, getTargetColor(color), ballSize, wheelScale);
      return indicator;
    }) ?? [];
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

  getRenderedSlots(): readonly (BallState | null)[] {
    return this.slots.map((ball) => (ball ? { ...ball } : null));
  }

  getTargetIndicatorPositions(): readonly { x: number; y: number }[] {
    return this.targetIndicators.map((indicator) => ({ x: indicator.x, y: indicator.y }));
  }

  getTargetIndicatorRotations(): readonly number[] {
    return this.targetIndicators.map((indicator) => indicator.rotation);
  }

  getClearEffectState(): Readonly<{ active: boolean; targetCount: number }> {
    return {
      active: this.clearEffectActive,
      targetCount: this.clearEffectTargetCount
    };
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

  playClearEffect(
    onComplete: () => void,
    extraTargets: readonly Phaser.GameObjects.Image[] = []
  ): void {
    const affectedBalls = [
      ...this.balls.filter(
        (_ball, localSlotIndex) => this.slots[localSlotIndex] !== null
      ),
      ...extraTargets
    ];

    if (affectedBalls.length === 0) {
      onComplete();
      return;
    }

    this.clearEffectActive = true;
    this.clearEffectTargetCount = affectedBalls.length;
    for (const ball of affectedBalls) {
      ball.setTint(0xffb347);
      ball.setAlpha(1);
    }

    this.scene.tweens.add({
      targets: affectedBalls,
      alpha: 0.15,
      duration: 120,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => {
        for (const ball of affectedBalls) {
          ball.clearTint();
          ball.setAlpha(1);
        }
        this.clearEffectActive = false;
        this.clearEffectTargetCount = 0;
        onComplete();
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
      const indicator = this.targetIndicators[localSlotIndex];

      indicator?.setPosition(
        this.assembly.x + Math.cos(angle) * this.ballRadius,
        this.assembly.y + Math.sin(angle) * this.ballRadius
      );
      indicator?.setRotation(angle + Math.PI / 2);

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

function drawTargetU(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
  ballSize: number,
  _wheelScale: number
): void {
  const innerRadius = ballSize * 0.56;
  const fadeDistance = ballSize * 0.42;
  const startAngle = Math.PI * 0.12;
  const endAngle = Math.PI * 0.88;
  const angleSegments = 16;
  const radialLayers = 8;
  const pointAt = (angle: number, radius: number) => ({
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  });
  const radiusAt = (angle: number) =>
    innerRadius + Math.sin(((angle - startAngle) / (endAngle - startAngle)) * Math.PI) * ballSize * 0.035;
  const smoothFade = (value: number) => value * value * (3 - 2 * value);

  // Adjacent curved strips create a real spatial fade: saturated beside the socket,
  // transparent at the outer edge toward the wheel's yellow center.
  for (let angleIndex = 0; angleIndex < angleSegments; angleIndex += 1) {
    const angle0 = startAngle + ((endAngle - startAngle) * angleIndex) / angleSegments;
    const angle1 = startAngle + ((endAngle - startAngle) * (angleIndex + 1)) / angleSegments;
    const anglePosition = (angleIndex + 0.5) / angleSegments;
    const endTaper = Math.pow(Math.sin(Math.PI * anglePosition), 0.8);
    const localFadeDistance = fadeDistance * endTaper;

    for (let radialIndex = 0; radialIndex < radialLayers; radialIndex += 1) {
      const fade0 = radialIndex / radialLayers;
      const fade1 = (radialIndex + 1) / radialLayers;
      const alpha = 0.98 * (1 - smoothFade((fade0 + fade1) / 2));
      const inner0 = radiusAt(angle0) + localFadeDistance * fade0;
      const inner1 = radiusAt(angle1) + localFadeDistance * fade0;
      const outer0 = radiusAt(angle0) + localFadeDistance * fade1;
      const outer1 = radiusAt(angle1) + localFadeDistance * fade1;

      graphics.fillStyle(color, alpha);
      graphics.fillPoints([
        pointAt(angle0, inner0),
        pointAt(angle1, inner1),
        pointAt(angle1, outer1),
        pointAt(angle0, outer0)
      ], true);
    }
  }
}

function drawSocketDepth(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
  ballSize: number
): void {
  graphics.fillStyle(color, 0.78);
  graphics.fillCircle(0, 0, ballSize * 0.25);
  graphics.fillStyle(0x030405, 0.58);
  graphics.fillCircle(0, 0, ballSize * 0.16);
}

function getTargetColor(color: BallColor): number {
  switch (color) {
    case "red": return 0xb72c22;
    case "green": return 0x237a3d;
    case "blue": return 0x1e61b0;
  }
}

function getTargetDepthColor(color: BallColor): number {
  switch (color) {
    case "red": return 0x45130f;
    case "green": return 0x12351c;
    case "blue": return 0x102747;
  }
}
