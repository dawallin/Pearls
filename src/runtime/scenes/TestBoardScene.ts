import Phaser from "phaser";

import {
  type DispatcherDownLevelComponent,
  type VerticalSlideLevelComponent,
  type WheelLevelComponent
} from "../../core/level/gridLevel";
import { testDispatcherSlideWheel1x3Level } from "../../core/levels/test/testDispatcherSlideWheel1x3Level";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  DispatchBoardController,
  type WheelAnimationInstruction
} from "../game/DispatchBoardController";
import { createGridLayout, getGridCellLayout } from "../layout/gridLayout";

const DISPATCHER_KEY = "dispatcher-down";
const SLIDE_KEY = "vertical-slide";
const WHEEL_KEY = "wheel";
const BALL_SOURCE_KEY = "ball-source";
const BALL_KEY = "ball";
const SUBSTEPS_PER_TURN = 3;
const SUBSTEP_DURATION_MS = 70;
const DISPATCH_DURATION_MS = 520;
const WHEEL_TURN_RADIANS = Math.PI / 4;
const BALL_TEXTURE_SIZE = 192;
const BALL_SOURCE_CROP = {
  x: 422,
  y: 112,
  size: 184
};
const WHEEL_SLOT_COUNT = 8;

type ComponentCenter = Readonly<{
  x: number;
  y: number;
}>;

export class TestBoardScene extends Phaser.Scene {
  private readonly level = testDispatcherSlideWheel1x3Level;
  private readonly controller = new DispatchBoardController({
    dispatcherId: "dispatcher-01",
    slideId: "slide-01",
    wheelId: "wheel-01",
    wheelSlotCount: 8,
    dispatcherHasInitialBall: true
  });

  private readonly componentCenters = new Map<string, ComponentCenter>();
  private dispatcherBall?: Phaser.GameObjects.Image;
  private transitBall?: Phaser.GameObjects.Image;
  private wheelBall?: Phaser.GameObjects.Image;
  private wheelAssembly?: Phaser.GameObjects.Container;
  private wheelBallRadius = 0;
  private wheelBallLocalSlotIndex: number | null = null;

  constructor() {
    super("test-board");
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    this.load.image(DISPATCHER_KEY, "assets/dispatcherDown.png");
    this.load.image(SLIDE_KEY, "assets/verticalSlide.png");
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
      .text(width / 2, height - 42, "Click the dispatcher, then click the wheel after the ball lands.", {
        color: "#d6d0c1",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "18px"
      })
      .setOrigin(0.5);

    this.drawGrid(layout);
    this.createLevelComponents(layout);
    this.syncAuthoritativeVisuals();

    const uninstallDebug = installPearlsDebug({
      getSnapshot: () => {
        const snapshot = this.controller.getSnapshot();

        return {
          levelId: this.level.id,
          levelName: this.level.name,
          grid: {
            columns: this.level.columns,
            rows: this.level.rows
          },
          components: {
            dispatcher: {
              ...snapshot.dispatcher,
              center: this.componentCenters.get(snapshot.dispatcher.id)
            },
            slide: {
              ...snapshot.slide,
              center: this.componentCenters.get(snapshot.slide.id)
            },
            wheel: {
              ...snapshot.wheel,
              center: this.componentCenters.get(snapshot.wheel.id)
            }
          },
          transitInProgress: snapshot.transitInProgress,
          lastEvents: snapshot.lastEvents
        };
      },
      pressDispatcher: () => this.dispatchBall(),
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

    for (let row = 1; row < this.level.rows; row += 1) {
      const y = layout.originY + row * layout.cellHeight;
      graphics.lineBetween(layout.originX, y, layout.originX + layout.width, y);
    }

    for (const cell of this.level.cells) {
      const cellLayout = getGridCellLayout(layout, cell);
      graphics.fillStyle(0x142330, 0.42);
      graphics.fillRoundedRect(
        cellLayout.centerX - cellLayout.width * 0.44,
        cellLayout.centerY - cellLayout.height * 0.44,
        cellLayout.width * 0.88,
        cellLayout.height * 0.88,
        18
      );
    }
  }

  private createLevelComponents(layout: ReturnType<typeof createGridLayout>): void {
    for (const cell of this.level.cells) {
      switch (cell.component.type) {
        case "dispatcherDown":
          this.createDispatcher(layout, cell.component, {
            column: cell.column,
            row: cell.row
          });
          break;
        case "verticalSlide":
          this.createVerticalSlide(layout, cell.component, {
            column: cell.column,
            row: cell.row
          });
          break;
        case "wheel":
          this.createWheel(layout, cell.component, {
            column: cell.column,
            row: cell.row
          });
          break;
      }
    }
  }

  private createDispatcher(
    layout: ReturnType<typeof createGridLayout>,
    component: DispatcherDownLevelComponent,
    cell: { column: number; row: number }
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    const dispatcher = this.add.image(cellLayout.centerX, cellLayout.centerY, DISPATCHER_KEY);
    const maxSize = Math.min(cellLayout.width, cellLayout.height) * 0.76;
    const dispatcherScale = maxSize / Math.max(dispatcher.width, dispatcher.height);

    dispatcher.setScale(dispatcherScale);
    dispatcher.setInteractive({ useHandCursor: true });
    dispatcher.on("pointerdown", () => this.dispatchBall());

    const ball = this.add.image(cellLayout.centerX, cellLayout.centerY, BALL_KEY);
    ball.setScale((dispatcher.width * 0.16 * dispatcherScale) / ball.width);

    this.dispatcherBall = ball;
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private createVerticalSlide(
    layout: ReturnType<typeof createGridLayout>,
    component: VerticalSlideLevelComponent,
    cell: { column: number; row: number }
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    const slide = this.add.image(cellLayout.centerX, cellLayout.centerY, SLIDE_KEY);
    const maxWidth = cellLayout.width * 0.76;
    const maxHeight = cellLayout.height * 0.76;
    const slideScale = Math.min(maxWidth / slide.width, maxHeight / slide.height);

    slide.setScale(slideScale);
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private createWheel(
    layout: ReturnType<typeof createGridLayout>,
    component: WheelLevelComponent,
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
    ball.setVisible(false);
    wheel.setInteractive({ useHandCursor: true });
    wheel.on("pointerdown", () => this.rotateWheel());

    this.wheelAssembly = assembly;
    this.wheelBall = ball;
    this.children.bringToTop(ball);
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private syncAuthoritativeVisuals(): void {
    const snapshot = this.controller.getSnapshot();

    this.wheelBallLocalSlotIndex = snapshot.wheel.ballLocalSlotIndex;
    this.syncWheelBallPose();

    if (this.dispatcherBall) {
      this.dispatcherBall.setVisible(snapshot.dispatcher.hasBall);
    }

    if (this.wheelBall) {
      this.wheelBall.setVisible(snapshot.wheel.hasBall && !snapshot.transitInProgress);
    }

  }

  private dispatchBall(): void {
    const instruction = this.controller.requestDispatch();

    if (!instruction) {
      return;
    }

    const dispatcherCenter = this.componentCenters.get(instruction.dispatcherId);
    const wheelCenter = this.componentCenters.get(instruction.wheelId);

    if (!dispatcherCenter || !wheelCenter || !this.wheelBall) {
      return;
    }

    this.dispatcherBall?.setVisible(false);
    this.wheelBallLocalSlotIndex = this.controller.getSnapshot().wheel.ballLocalSlotIndex;
    this.syncWheelBallPose();

    if (!this.transitBall) {
      this.transitBall = this.add.image(dispatcherCenter.x, dispatcherCenter.y, BALL_KEY);
      this.transitBall.setScale(this.wheelBall.scaleX);
    }

    this.transitBall.setPosition(dispatcherCenter.x, dispatcherCenter.y);
    this.transitBall.setVisible(true);

    const wheelBallWorldPosition = this.getWheelBallWorldPosition();

    if (!wheelBallWorldPosition) {
      return;
    }

    this.tweens.add({
      targets: this.transitBall,
      x: wheelBallWorldPosition.x,
      y: wheelBallWorldPosition.y,
      duration: DISPATCH_DURATION_MS,
      ease: "Sine.InOut",
      onComplete: () => {
        this.transitBall?.setVisible(false);
        this.controller.completeDispatchAnimation();
        this.syncAuthoritativeVisuals();
      }
    });
  }

  private syncWheelBallPose(): void {
    if (!this.wheelBall || !this.wheelAssembly) {
      return;
    }

    if (this.wheelBallLocalSlotIndex === null) {
      return;
    }

    const baseAngle =
      ((this.wheelBallLocalSlotIndex % WHEEL_SLOT_COUNT) / WHEEL_SLOT_COUNT) *
        Math.PI *
        2 -
      Math.PI / 2;
    const angle = baseAngle + this.wheelAssembly.rotation;

    this.wheelBall.setPosition(
      this.wheelAssembly.x + Math.cos(angle) * this.wheelBallRadius,
      this.wheelAssembly.y + Math.sin(angle) * this.wheelBallRadius
    );
  }

  private getWheelBallWorldPosition(): ComponentCenter | null {
    if (!this.wheelBall) {
      return null;
    }
    this.syncWheelBallPose();

    return {
      x: this.wheelBall.x,
      y: this.wheelBall.y
    }
  }

  private rotateWheel(): void {
    const instruction = this.controller.requestRotateWheel();

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
        const nextInstruction = this.controller.completeWheelAnimation();

        if (nextInstruction) {
          this.animateWheelTurn(nextInstruction);
        }
      }
    });
  }
}
