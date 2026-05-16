import Phaser from "phaser";

import type { TestCatalogEntry } from "./testCatalog";

export function createPearlsGame(parent: string, test: TestCatalogEntry): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b1117",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [test.createScene()]
  });
}
