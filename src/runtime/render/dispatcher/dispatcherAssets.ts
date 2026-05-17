import Phaser from "phaser";

export const DISPATCHER_DOWN_KEY = "dispatcher-down";
export const DISPATCHER_BACKGROUND_KEY = "dispatcher-background";
export const DISPATCHER_RIGHT_KEY = "dispatcher-right";
export const DISPATCHER_RIGHT_BACKGROUND_KEY = "dispatcher-right-background";

export type DispatcherDirection = "down" | "right";

export function getDispatcherAssetKeys(
  direction: DispatcherDirection
): { foreground: string; background: string } {
  if (direction === "right") {
    return {
      foreground: DISPATCHER_RIGHT_KEY,
      background: DISPATCHER_RIGHT_BACKGROUND_KEY
    };
  }

  return {
    foreground: DISPATCHER_DOWN_KEY,
    background: DISPATCHER_BACKGROUND_KEY
  };
}

export function preloadDispatcherAssets(scene: Phaser.Scene): void {
  scene.load.image(DISPATCHER_DOWN_KEY, "assets/dispatcherDown.png");
  scene.load.image(DISPATCHER_BACKGROUND_KEY, "assets/dispatcherBackground.png");
  scene.load.image(DISPATCHER_RIGHT_KEY, "assets/dispatcherRight.png");
  scene.load.image(DISPATCHER_RIGHT_BACKGROUND_KEY, "assets/dispatcherRightBackground.png");
}
