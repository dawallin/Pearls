import Phaser from "phaser";

export const VERTICAL_SLIDE_KEY = "vertical-slide";
export const HORIZONTAL_SLIDE_KEY = "horizontal-slide";

export function preloadSlideAssets(scene: Phaser.Scene): void {
  scene.load.image(VERTICAL_SLIDE_KEY, "assets/verticalSlide.png");
  scene.load.image(HORIZONTAL_SLIDE_KEY, "assets/horizontalSlide.png");
}
