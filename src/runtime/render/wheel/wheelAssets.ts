import Phaser from "phaser";

export const WHEEL_KEY = "wheel";

export function preloadWheelAssets(scene: Phaser.Scene): void {
  scene.load.image(WHEEL_KEY, "assets/Wheel.png");
}
