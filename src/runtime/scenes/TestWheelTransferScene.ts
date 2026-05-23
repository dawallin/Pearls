import Phaser from "phaser";

import {
  type GridLevelDefinition,
  type LevelCell,
  type VerticalSlideLevelComponent,
  type WheelLevelComponent
} from "../../core/level/gridLevel";
import { testWheelTransfer3x8Level } from "../../core/levels/test/testWheelTransfer3x8Level";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  WheelTransferController,
  type TransferAnimationInstruction,
  type TransferWheelAnimationInstruction
} from "../game/WheelTransferController";
import { createGridLayout, getGridCellLayout } from "../layout/gridLayout";
import { getBounceContactPoint } from "./bounceGeometry";
import {
  createPearlTexture,
  getPearlTextureKey,
  preloadPearlAssets
} from "../render/pearl/pearlAssets";
import { SlideView } from "../render/slide/SlideView";
import { preloadSlideAssets } from "../render/slide/slideAssets";
import { createAutomaticWheelConnectorSlides } from "../render/slide/slidePath";
import { WheelView } from "../render/wheel/WheelView";
import { preloadWheelAssets } from "../render/wheel/wheelAssets";

const TRANSFER_DURATION_MS = 520;
const BOUNCE_VISUAL_PENETRATION_FACTOR = 0.35;

type ComponentCenter = Readonly<{
  x: number;
  y: number;
}>;

type TestWheelTransferSceneConfig = Readonly<{
  level?: GridLevelDefinition;
  controller?: {
    topWheelId: string;
    bottomWheelId: string;
    wheelSlotCount: number;
    initialBallWheelIds?: readonly string[];
  };
}>;

export class TestWheelTransferScene extends Phaser.Scene {
  private readonly level: GridLevelDefinition;
  private readonly controller: WheelTransferController;
  private readonly componentCenters = new Map<string, ComponentCenter>();
  private readonly wheelViews = new Map<string, WheelView>();
  private transitBall?: Phaser.GameObjects.Image;

  constructor(config: TestWheelTransferSceneConfig = {}) {
    super("test-wheel-transfer");

    this.level = config.level ?? testWheelTransfer3x8Level;
    this.controller = new WheelTransferController(
      config.controller ?? {
        topWheelId: "wheel-top",
        bottomWheelId: "wheel-bottom",
        wheelSlotCount: 8
      }
    );
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    preloadPearlAssets(this);
    preloadSlideAssets(this);
    preloadWheelAssets(this);
  }

  create(): void {
    const { width, height } = this.scale;
    createPearlTexture(this);
    const layout = createGridLayout(this.level, width, height);

    this.add
      .text(width / 2, 52, `${this.level.name} · ${this.level.columns}x${this.level.rows} Grid`, {
        color: "#f3efe4",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "28px"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 42, "Click the ball to transfer. Click a wheel center to rotate.", {
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
            wheels: Object.fromEntries(
              Object.entries(snapshot.wheels).map(([wheelId, wheel]) => [
                wheelId,
                {
                  ...wheel,
                  center: this.componentCenters.get(wheelId),
                  slotCenters: Array.from({ length: wheel.slots.length }, (_, slotIndex) =>
                    this.wheelViews.get(wheelId)?.getBallWorldPosition(slotIndex) ?? null
                  ),
                  ballCenter:
                    wheel.ballLocalSlotIndex === null
                      ? null
                      : this.wheelViews
                          .get(wheelId)
                          ?.getBallWorldPosition(wheel.ballLocalSlotIndex) ?? null
                }
              ])
            )
          },
          transitInProgress: snapshot.transitInProgress,
          lastEvents: snapshot.lastEvents
        };
      },
      pressDispatcher: () => undefined,
      requestRotateTurn: (wheelId?: string) => {
        if (wheelId) {
          this.rotateWheel(wheelId);
        }
      }
    });

    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", uninstallDebug);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.scene.restart();
  }

  private drawGrid(layout: ReturnType<typeof createGridLayout>): void {
    const graphics = this.add.graphics();

    graphics.lineStyle(1, 0xc8d7e6, 0.28);
    graphics.strokeRect(layout.originX, layout.originY, layout.width, layout.height);

    for (let row = 1; row < this.level.rows; row += 1) {
      const y = layout.originY + row * layout.cellHeight;
      graphics.lineBetween(layout.originX, y, layout.originX + layout.width, y);
    }

    for (let column = 1; column < this.level.columns; column += 1) {
      const x = layout.originX + column * layout.cellWidth;
      graphics.lineBetween(x, layout.originY, x, layout.originY + layout.height);
    }
  }

  private createLevelComponents(layout: ReturnType<typeof createGridLayout>): void {
    for (const cell of this.level.cells) {
      switch (cell.component.type) {
        case "verticalSlide":
          this.createSlide(layout, cell.component, cell);
          break;
        case "wheel":
          this.createWheel(layout, cell.component, cell);
          break;
        case "dispatcherDown":
        case "dispatcherRight":
        case "horizontalSlide":
          break;
      }
    }
  }

  private createSlide(
    layout: ReturnType<typeof createGridLayout>,
    component: VerticalSlideLevelComponent,
    cell: LevelCell
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);

    new SlideView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      width: cellLayout.width,
      height: cellLayout.height,
      direction: "vertical"
    });
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private createWheel(
    layout: ReturnType<typeof createGridLayout>,
    component: WheelLevelComponent,
    cell: LevelCell
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    createAutomaticWheelConnectorSlides(this, layout, this.level, cell);
    const maxWheelSize = Math.min(cellLayout.width, cellLayout.height) * 0.94;

    const wheelView = new WheelView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      size: maxWheelSize,
      slotCount: component.slotCount,
      hasBall: false,
      ballLocalSlotIndex: null,
      onPressed: () => this.rotateWheel(component.id),
      onBallPressed: () => this.transferBall(component.id)
    });

    this.wheelViews.set(component.id, wheelView);
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private syncAuthoritativeVisuals(): void {
    const snapshot = this.controller.getSnapshot();

    for (const [wheelId, wheel] of Object.entries(snapshot.wheels)) {
      this.wheelViews.get(wheelId)?.setWheelSlots(
        snapshot.transitInProgress ? [] : wheel.slots
      );
    }
  }

  private transferBall(sourceWheelId: string): void {
    const instruction = this.controller.requestTransfer(sourceWheelId);

    if (!instruction) {
      return;
    }

    this.animateTransfer(instruction);
  }

  private animateTransfer(instruction: TransferAnimationInstruction): void {
    const sourceWheelView = this.wheelViews.get(instruction.fromWheelId);
    const targetWheelView = this.wheelViews.get(instruction.toWheelId);
    const sourceBallPosition = sourceWheelView?.getBallWorldPosition(
      instruction.sourceLocalSlotIndex
    );
    const targetBallPosition = targetWheelView?.getBallWorldPosition(
      instruction.targetLocalSlotIndex
    );

    if (!sourceWheelView || !targetWheelView || !sourceBallPosition || !targetBallPosition) {
      this.controller.completeTransferAnimation();
      this.syncAuthoritativeVisuals();
      return;
    }

    const snapshot = this.controller.getSnapshot();

    for (const [wheelId, wheel] of Object.entries(snapshot.wheels)) {
      const visibleSlots =
        instruction.type === "transfer"
          ? wheel.slots.map((occupantId, index) =>
              wheelId === instruction.toWheelId && index === instruction.targetLocalSlotIndex
                ? null
                : occupantId
            )
          : wheel.slots.map((occupantId, index) =>
              wheelId === instruction.fromWheelId && index === instruction.sourceLocalSlotIndex
                ? null
                : occupantId
            );

      this.wheelViews.get(wheelId)?.setWheelSlots(visibleSlots);
    }

    if (!this.transitBall) {
      this.transitBall = this.add.image(
        sourceBallPosition.x,
        sourceBallPosition.y,
        getPearlTextureKey("red")
      );
    }

    this.transitBall.setTexture(getPearlTextureKey("red"));
    this.transitBall.setScale(sourceWheelView.getBallScale());
    this.transitBall.setPosition(sourceBallPosition.x, sourceBallPosition.y);
    this.transitBall.setVisible(true);

    const completeAnimation = () => {
      this.transitBall?.setVisible(false);
      this.controller.completeTransferAnimation();
      this.syncAuthoritativeVisuals();
    };

    if (instruction.type === "bounce") {
      const bounceContactPoint = getBounceContactPoint(
        sourceBallPosition,
        targetBallPosition,
        sourceWheelView.getBallVisualRadius(),
        targetWheelView.getBallVisualRadius(),
        BOUNCE_VISUAL_PENETRATION_FACTOR
      );

      this.tweens.add({
        targets: this.transitBall,
        x: bounceContactPoint.x,
        y: bounceContactPoint.y,
        duration: TRANSFER_DURATION_MS,
        ease: "Sine.InOut",
        yoyo: true,
        onComplete: completeAnimation
      });
      return;
    }

    this.tweens.add({
      targets: this.transitBall,
      x: targetBallPosition.x,
      y: targetBallPosition.y,
      duration: TRANSFER_DURATION_MS,
      ease: "Sine.InOut",
      onComplete: completeAnimation
    });
  }

  private rotateWheel(wheelId: string): void {
    const instruction = this.controller.requestRotateWheel(wheelId);

    if (instruction) {
      this.animateWheelTurn(instruction);
    }
  }

  private animateWheelTurn(instruction: TransferWheelAnimationInstruction): void {
    const wheelView = this.wheelViews.get(instruction.wheelId);

    if (!wheelView) {
      return;
    }

    wheelView.animateTurn(instruction, () =>
      this.controller.completeWheelAnimation(instruction.wheelId)
    );
  }
}
