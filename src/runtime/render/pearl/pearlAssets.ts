import Phaser from "phaser";

import type { BallColor } from "../../../core/ball/ballState";

export const PEARL_SOURCE_KEY = "pearl-source";
export const PEARL_KEY = "pearl-red";
export const PEARL_DIAMETER_FACTOR = 65.6 / 306;

const PEARL_TEXTURE_KEYS: Readonly<Record<BallColor, string>> = {
  red: "pearl-red",
  green: "pearl-green",
  blue: "pearl-blue"
};
const PEARL_ASSET_PATHS: Readonly<Record<BallColor, string>> = {
  red: "assets/RedBall.svg",
  green: "assets/GreenBall.svg",
  blue: "assets/BlueBall.svg"
};

export function preloadPearlAssets(scene: Phaser.Scene): void {
  for (const color of Object.keys(PEARL_TEXTURE_KEYS) as BallColor[]) {
    scene.load.svg(PEARL_TEXTURE_KEYS[color], PEARL_ASSET_PATHS[color]);
  }
}

export function createPearlTexture(scene: Phaser.Scene): void {
  void scene;
}

export function getPearlTextureKey(color: BallColor): string {
  return PEARL_TEXTURE_KEYS[color];
}
