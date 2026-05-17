import Phaser from "phaser";

import { HORIZONTAL_SLIDE_KEY, VERTICAL_SLIDE_KEY } from "./slideAssets";

export type SlideViewConfig = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: "horizontal" | "vertical";
}>;

export class SlideView {
  constructor(scene: Phaser.Scene, config: SlideViewConfig) {
    const slide = scene.add.image(
      config.x,
      config.y,
      config.direction === "horizontal" ? HORIZONTAL_SLIDE_KEY : VERTICAL_SLIDE_KEY
    );

    slide.setDisplaySize(config.width, config.height);
  }
}
