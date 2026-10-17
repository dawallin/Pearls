import Phaser from "phaser";

import {
  type GridLevelDefinition,
  type LevelCell,
  type VerticalSlideLevelComponent,
  type WheelLevelComponent
} from "../../core/level/gridLevel";
import { testWheelTransfer3x8Level } from "../../core/levels/test/testWheelTransfer3x8Level";
import { GRID_UNITS_PER_CELL, WHEEL_COMPONENT_RENDER_FIT_FACTOR } from "../../core/geometry/physicalGeometry";
import {
  WHEEL_TRANSFER_FIXED_TICK_MS
} from "../../core/board/wheelTransferWorld";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  WheelTransferController,
  type TransferWheelAnimationInstruction
} from "../game/WheelTransferController";
import { createGridLayout, getGridCellLayout, type GridLayout } from "../layout/gridLayout";
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

const MAX_FRAME_DELTA_MS = 250;
const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

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
    topConnectedWorldSlotIndex?: number;
    bottomConnectedWorldSlotIndex?: number;
    initialBallWheelIds?: readonly string[];
    initialBalls?: readonly Readonly<{ wheelId: string; ball: { id: string; color: "red" | "green" | "blue" } }>[];
  };
}>;

export class TestWheelTransferScene extends Phaser.Scene {
  private readonly level: GridLevelDefinition;
  private readonly controller: WheelTransferController;
  private readonly componentCenters = new Map<string, ComponentCenter>();
  private readonly wheelViews = new Map<string, WheelView>();
  private readonly transitBalls = new Map<string, Phaser.GameObjects.Image>();
  private readonly speedButtons = new Map<number, Phaser.GameObjects.Text>();
  private gridLayout: GridLayout | null = null;
  private simulationAccumulatorMs = 0;
  private simulationSpeed = 1;

  constructor(config: TestWheelTransferSceneConfig = {}) {
    super("test-wheel-transfer");

    this.level = config.level ?? testWheelTransfer3x8Level;
    this.controller = new WheelTransferController(
      config.controller ? {
        ...config.controller,
        level: this.level,
        topConnectedWorldSlotIndex: config.controller.topConnectedWorldSlotIndex ?? 4,
        bottomConnectedWorldSlotIndex: config.controller.bottomConnectedWorldSlotIndex ?? 0
      } : {
        level: this.level,
        topWheelId: "wheel-top",
        bottomWheelId: "wheel-bottom",
        wheelSlotCount: 8,
        topConnectedWorldSlotIndex: 4,
        bottomConnectedWorldSlotIndex: 0
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
    this.gridLayout = layout;

    this.add
      .text(width / 2, 52, `${this.level.name} · ${this.level.columns}x${this.level.rows} Grid`, {
        color: "#f3efe4",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "28px"
      })
      .setOrigin(0.5);

    this.createSpeedDial(width);

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
          simulationSpeed: this.simulationSpeed,
          activeTransits: snapshot.activeTransits,
          lastEvents: snapshot.lastEvents
        };
      },
      pressDispatcher: () => undefined,
      requestRotateTurn: (wheelId?: string) => {
        if (wheelId) {
          this.rotateWheel(wheelId);
        }
      },
      advanceTime: (ticks) => {
        this.controller.advanceTime(ticks);
        this.syncAuthoritativeVisuals();
      },
      setSimulationSpeed: (multiplier) => this.setSimulationSpeed(multiplier)
    });

    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", uninstallDebug);
  }

  update(_time: number, deltaMs: number): void {
    this.simulationAccumulatorMs +=
      Math.min(deltaMs, MAX_FRAME_DELTA_MS) * this.simulationSpeed;
    const ticks = Math.floor(
      this.simulationAccumulatorMs / WHEEL_TRANSFER_FIXED_TICK_MS
    );

    if (ticks === 0) {
      return;
    }

    this.simulationAccumulatorMs -= ticks * WHEEL_TRANSFER_FIXED_TICK_MS;
    this.controller.advanceTime(ticks);
    this.syncAuthoritativeVisuals();
  }

  private createSpeedDial(width: number): void {
    this.add
      .text(width - 232, 24, "Speed", {
        color: "#d6d0c1",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "16px"
      })
      .setOrigin(0, 0.5);

    for (const [index, speed] of SPEED_OPTIONS.entries()) {
      const button = this.add
        .text(width - 156 + index * 42, 24, `${speed}×`, {
          color: "#d6d0c1",
          backgroundColor: "#142330",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "15px",
          padding: { x: 8, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.setSimulationSpeed(speed));
      this.speedButtons.set(speed, button);
    }

    this.refreshSpeedDial();
  }

  private setSimulationSpeed(multiplier: number): void {
    if (!SPEED_OPTIONS.includes(multiplier as (typeof SPEED_OPTIONS)[number])) {
      throw new Error(`Unsupported simulation speed: ${multiplier}.`);
    }

    this.simulationSpeed = multiplier;
    this.tweens.timeScale = multiplier;
    this.refreshSpeedDial();
  }

  private refreshSpeedDial(): void {
    for (const [speed, button] of this.speedButtons) {
      const isSelected = speed === this.simulationSpeed;
      button.setColor(isSelected ? "#0b1117" : "#d6d0c1");
      button.setBackgroundColor(isSelected ? "#f3c969" : "#142330");
    }
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
    const maxWheelSize = Math.min(cellLayout.width, cellLayout.height) * WHEEL_COMPONENT_RENDER_FIT_FACTOR;

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
      this.wheelViews.get(wheelId)?.setWheelSlots(wheel.slots);
    }
    this.syncTransitVisuals();
  }

  private transferBall(sourceWheelId: string): void {
    const instruction = this.controller.requestTransfer(sourceWheelId);

    if (!instruction) {
      return;
    }

    void instruction;
    this.syncAuthoritativeVisuals();
  }

  private syncTransitVisuals(): void {
    const snapshot = this.controller.getSnapshot();
    const activeIds = new Set(snapshot.activeTransits.map((transit) => transit.ball.id));
    for (const [ballId, image] of this.transitBalls) {
      if (!activeIds.has(ballId)) image.destroy();
    }
    for (const ballId of this.transitBalls.keys()) {
      if (!activeIds.has(ballId)) this.transitBalls.delete(ballId);
    }
    for (const transit of snapshot.activeTransits) {
      const segment = transit.segment;
      const visualGeometry = this.projectStaticSegment(segment);
      if (!segment || !visualGeometry) continue;
      const progress = transit.localProgress / segment.length;
      const image = this.transitBalls.get(transit.ball.id) ?? this.add.image(visualGeometry.entry.x, visualGeometry.entry.y, getPearlTextureKey(transit.ball.color));
      image.setTexture(getPearlTextureKey(transit.ball.color));
      image.setScale(this.wheelViews.get(snapshot.topWheelId)?.getBallScale() ?? 1);
      image.setPosition(visualGeometry.entry.x + (visualGeometry.exit.x - visualGeometry.entry.x) * progress, visualGeometry.entry.y + (visualGeometry.exit.y - visualGeometry.entry.y) * progress);
      this.transitBalls.set(transit.ball.id, image);
    }
  }

  private projectStaticSegment(segment: ReturnType<WheelTransferController["getSnapshot"]>["components"][number]): { entry: ComponentCenter; exit: ComponentCenter } | null {
    if (!this.gridLayout) return null;
    const project = (point: { x: number; y: number }): ComponentCenter => ({
      x: this.gridLayout!.originX + point.x / GRID_UNITS_PER_CELL * this.gridLayout!.cellWidth,
      y: this.gridLayout!.originY + point.y / GRID_UNITS_PER_CELL * this.gridLayout!.cellHeight
    });
    return { entry: project(segment.entry), exit: project(segment.exit) };
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
