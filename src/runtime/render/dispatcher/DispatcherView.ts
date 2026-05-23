import Phaser from "phaser";

import type { BallState } from "../../../core/ball/ballState";
import { PEARL_DIAMETER_FACTOR, getPearlTextureKey } from "../pearl/pearlAssets";
import {
  getDispatcherAssetKeys,
  type DispatcherDirection
} from "./dispatcherAssets";

export type DispatcherViewConfig = Readonly<{
  x: number;
  y: number;
  size: number;
  direction?: DispatcherDirection;
  hasBall: boolean;
  ball?: BallState | null;
  onPressed: () => void;
}>;

export class DispatcherView {
  private readonly ball: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, config: DispatcherViewConfig) {
    const assetKeys = getDispatcherAssetKeys(config.direction ?? "down");
    const background = scene.add.image(config.x, config.y, assetKeys.background);
    const dispatcher = scene.add.image(config.x, config.y, assetKeys.foreground);
    const dispatcherScale = config.size / Math.max(dispatcher.width, dispatcher.height);
    const ballSize = config.size * PEARL_DIAMETER_FACTOR;

    background.setScale(dispatcherScale);
    dispatcher.setScale(dispatcherScale);

    this.ball = scene.add.image(
      config.x,
      config.y,
      getPearlTextureKey(config.ball?.color ?? "red")
    );
    this.ball.setScale(ballSize / this.ball.width);
    this.setBall(config.ball ?? (config.hasBall ? { id: "legacy-ball", color: "red" } : null));

    background.setDepth(0);
    this.ball.setDepth(1);
    dispatcher.setDepth(2);

    dispatcher.setInteractive({ useHandCursor: true });
    dispatcher.on("pointerdown", config.onPressed);
  }

  setBallVisible(visible: boolean): void {
    this.ball.setVisible(visible);
  }

  setBall(ball: BallState | null): void {
    if (ball) {
      this.ball.setTexture(getPearlTextureKey(ball.color));
    }

    this.ball.setVisible(ball !== null);
  }

  getBallScale(): number {
    return this.ball.scaleX;
  }

  getBallWorldPosition(): { x: number; y: number } {
    return {
      x: this.ball.x,
      y: this.ball.y
    };
  }
}
