import Phaser from "phaser";

import { TestWheelScene } from "../scenes/TestWheelScene";

export function createPearlsGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b1117",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [TestWheelScene]
  });
}
