import Phaser from "phaser";

import { testWheel1x1Level } from "../../core/levels/test/testWheel1x1Level";
import type { WheelLevelComponent } from "../../core/level/gridLevel";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  WheelController,
  type WheelAnimationInstruction
} from "../game/WheelController";
import { createGridLayout, getGridCellLayout } from "../layout/gridLayout";

const WHEEL_KEY = "wheel";
const BALL_SOURCE_KEY = "ball-source";
const BALL_KEY = "ball";
const SUBSTEPS_PER_TURN = 3;
const SUBSTEP_DURATION_MS = 70;
const WHEEL_TURN_RADIANS = Math.PI / 4;
const BALL_TEXTURE_SIZE = 192;
const BALL_SOURCE_CROP = {
  x: 422,
  y: 112,
  size: 184
};
export class TestWheelScene extends Phaser.Scene {
  private readonly level = testWheel1x1Level;
  private readonly controller = new WheelController({
    wheelId: "wheel-01",
    slotCount: 8
  });
  private wheelAssembly?: Phaser.GameObjects.Container;
  private wheelBall?: Phaser.GameObjects.Image;
  private wheelBallRadius = 0;

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
    const layout = createGridLayout(this.level, width, height);

    this.add
      .text(width / 2, 52, `${this.level.name} · ${this.level.columns}x${this.level.rows} Grid`, {
        color: "#f3efe4",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "28px"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 42, "Click the wheel and inspect the smooth quarter-step rotation.", {
        color: "#d6d0c1",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "18px"
      })
      .setOrigin(0.5);

    this.drawGrid(layout);
    this.createWheel(layout, this.level.cells[0].component as WheelLevelComponent, {
      column: 0,
      row: 0
    });

    const uninstallDebug = installPearlsDebug({
      getSnapshot: () => ({
        levelId: this.level.id,
        levelName: this.level.name,
        grid: {
          columns: this.level.columns,
          rows: this.level.rows
        },
        wheel: this.controller.getSnapshot(this.wheelAssembly?.rotation ?? 0)
      }),
      pressDispatcher: () => {},
      requestRotateTurn: () => this.rotateWheel()
    });

    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", uninstallDebug);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
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

  private drawGrid(layout: ReturnType<typeof createGridLayout>): void {
    const graphics = this.add.graphics();

    graphics.lineStyle(3, 0x516170, 0.9);
    graphics.strokeRect(layout.originX, layout.originY, layout.width, layout.height);

    const cellLayout = getGridCellLayout(layout, { column: 0, row: 0 });
    graphics.fillStyle(0x142330, 0.42);
    graphics.fillRoundedRect(
      cellLayout.centerX - cellLayout.width * 0.44,
      cellLayout.centerY - cellLayout.height * 0.44,
      cellLayout.width * 0.88,
      cellLayout.height * 0.88,
      18
    );
  }

  private createWheel(
    layout: ReturnType<typeof createGridLayout>,
    _: WheelLevelComponent,
    cell: { column: number; row: number }
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    const wheel = this.add.image(0, 0, WHEEL_KEY);
    const ball = this.add.image(0, 0, BALL_KEY);
    const assembly = this.add.container(cellLayout.centerX, cellLayout.centerY, [wheel]);
    const maxWheelSize = Math.min(cellLayout.width, cellLayout.height) * 0.72;
    const wheelScale = maxWheelSize / wheel.width;
    const holeRadius = wheel.width * 0.348;
    const ballSize = wheel.width * 0.145 * wheelScale;

    wheel.setScale(wheelScale);
    ball.setScale(ballSize / ball.width);
    ball.setPosition(cellLayout.centerX, cellLayout.centerY - holeRadius * wheelScale);
    this.wheelBallRadius = holeRadius * wheelScale;
    wheel.setInteractive({ useHandCursor: true });
    wheel.on("pointerdown", () => this.rotateWheel());

    this.wheelAssembly = assembly;
    this.wheelBall = ball;
    this.children.bringToTop(ball);
    this.syncWheelBallPose();
  }

  private rotateWheel(): void {
    const instruction = this.controller.requestRotateTurn();

    if (instruction) {
      this.animateWheelTurn(instruction);
    }
  }

  private animateWheelTurn(_: WheelAnimationInstruction): void {
    if (!this.wheelAssembly) {
      return;
    }

    this.tweens.add({
      targets: this.wheelAssembly,
      rotation: this.wheelAssembly.rotation + WHEEL_TURN_RADIANS,
      duration: SUBSTEP_DURATION_MS * SUBSTEPS_PER_TURN,
      ease: "Cubic.Out",
      onUpdate: () => {
        this.syncWheelBallPose();
      },
      onComplete: () => {
        this.syncWheelBallPose();
        const nextInstruction = this.controller.completeAnimation();

        if (nextInstruction) {
          this.animateWheelTurn(nextInstruction);
        }
      }
    });
  }

  private syncWheelBallPose(): void {
    if (!this.wheelAssembly || !this.wheelBall) {
      return;
    }

    const angle = this.wheelAssembly.rotation - Math.PI / 2;

    this.wheelBall.setPosition(
      this.wheelAssembly.x + Math.cos(angle) * this.wheelBallRadius,
      this.wheelAssembly.y + Math.sin(angle) * this.wheelBallRadius
    );
  }
}
