import Phaser from "phaser";

const WHEEL_KEY = "wheel";
const BALL_SOURCE_KEY = "ball-source";
const BALL_KEY = "ball";
const TURN_DEGREES = 45;
const SUBSTEPS_PER_TURN = 3;
const SUBSTEP_DEGREES = TURN_DEGREES / SUBSTEPS_PER_TURN;
const SUBSTEP_DURATION_MS = 70;
const BALL_TEXTURE_SIZE = 192;
const BALL_SOURCE_CROP = {
  x: 422,
  y: 112,
  size: 184
};

export class TestWheelScene extends Phaser.Scene {
  private wheel?: Phaser.GameObjects.Image;
  private ball?: Phaser.GameObjects.Image;
  private wheelAssembly?: Phaser.GameObjects.Container;
  private queuedTurns = 0;
  private isTurning = false;

  constructor() {
    super("test-wheel");
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    this.load.image(WHEEL_KEY, "assets/Wheel.png");
    this.load.image(BALL_SOURCE_KEY, "assets/RedBall.png");
  }

  create(): void {
    const { width, height } = this.scale;
    this.createBallTexture();

    this.add
      .text(width / 2, 52, "Pearls Test Wheel", {
        color: "#f3efe4",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "32px"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 42, "Click the wheel to rotate one slot.", {
        color: "#d6d0c1",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "20px"
      })
      .setOrigin(0.5);

    this.wheel = this.add.image(0, 0, WHEEL_KEY);
    this.ball = this.add.image(0, 0, BALL_KEY);
    this.wheelAssembly = this.add.container(width / 2, height / 2, [this.wheel, this.ball]);

    this.wheel.setInteractive({ useHandCursor: true });

    this.fitWheelToViewport();
    this.wheel.on("pointerdown", () => this.queueTurn());

    this.scale.on("resize", this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);
    this.scene.restart();
  }

  private createBallTexture(): void {
    if (this.textures.exists(BALL_KEY)) {
      this.textures.remove(BALL_KEY);
    }

    const source = this.textures.get(BALL_SOURCE_KEY).getSourceImage() as CanvasImageSource;
    const texture = this.textures.createCanvas(BALL_KEY, BALL_TEXTURE_SIZE, BALL_TEXTURE_SIZE);

    if (!texture) {
      return;
    }

    texture.context.drawImage(
      source,
      BALL_SOURCE_CROP.x,
      BALL_SOURCE_CROP.y,
      BALL_SOURCE_CROP.size,
      BALL_SOURCE_CROP.size,
      0,
      0,
      BALL_TEXTURE_SIZE,
      BALL_TEXTURE_SIZE
    );
    texture.refresh();
  }

  private fitWheelToViewport(): void {
    if (!this.wheel || !this.ball || !this.wheelAssembly) {
      return;
    }

    const maxWheelSize = Math.min(this.scale.width, this.scale.height) * 0.64;
    const wheelScale = maxWheelSize / this.wheel.width;
    const holeRadius = this.wheel.width * 0.348;
    const ballSize = this.wheel.width * 0.145 * wheelScale;

    this.wheel.setScale(wheelScale);
    this.ball.setScale(ballSize / this.ball.width);
    this.ball.setPosition(0, -holeRadius * wheelScale);
  }

  private queueTurn(): void {
    this.queuedTurns += 1;

    if (!this.isTurning) {
      this.startNextTurn();
    }
  }

  private startNextTurn(): void {
    if (!this.wheelAssembly || this.queuedTurns === 0) {
      this.isTurning = false;
      return;
    }

    this.queuedTurns -= 1;
    this.isTurning = true;
    this.runSubstep(0);
  }

  private runSubstep(stepIndex: number): void {
    if (!this.wheelAssembly) {
      this.isTurning = false;
      return;
    }

    this.tweens.add({
      targets: this.wheelAssembly,
      angle: this.wheelAssembly.angle + SUBSTEP_DEGREES,
      duration: SUBSTEP_DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => {
        if (stepIndex + 1 < SUBSTEPS_PER_TURN) {
          this.runSubstep(stepIndex + 1);
          return;
        }

        this.isTurning = false;
        this.startNextTurn();
      }
    });
  }
}
