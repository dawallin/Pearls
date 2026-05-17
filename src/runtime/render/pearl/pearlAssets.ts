import Phaser from "phaser";

export const PEARL_SOURCE_KEY = "pearl-source";
export const PEARL_KEY = "pearl";
export const PEARL_DIAMETER_FACTOR = 65.6 / 306;

const PEARL_TEXTURE_SIZE = 256;
const PEARL_SOURCE_CROP = {
  x: 408,
  y: 124,
  size: 208
};

export function preloadPearlAssets(scene: Phaser.Scene): void {
  scene.load.image(PEARL_SOURCE_KEY, "assets/RedBall.png");
}

export function createPearlTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PEARL_KEY)) {
    scene.textures.remove(PEARL_KEY);
  }

  const source = scene.textures.get(PEARL_SOURCE_KEY).getSourceImage() as CanvasImageSource;
  const texture = scene.textures.createCanvas(
    PEARL_KEY,
    PEARL_TEXTURE_SIZE,
    PEARL_TEXTURE_SIZE
  );

  if (!texture) {
    return;
  }

  texture.context.clearRect(0, 0, PEARL_TEXTURE_SIZE, PEARL_TEXTURE_SIZE);
  texture.context.drawImage(
    source,
    PEARL_SOURCE_CROP.x,
    PEARL_SOURCE_CROP.y,
    PEARL_SOURCE_CROP.size,
    PEARL_SOURCE_CROP.size,
    0,
    0,
    PEARL_TEXTURE_SIZE,
    PEARL_TEXTURE_SIZE
  );
  texture.refresh();
}
