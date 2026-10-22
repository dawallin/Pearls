import Phaser from "phaser";

import {
  type DispatcherDownLevelComponent,
  type DispatcherRightLevelComponent,
  type GridLevelDefinition,
  type HorizontalSlideLevelComponent,
  type LevelCell,
  type VerticalSlideLevelComponent,
  type WheelLevelComponent
} from "../../core/level/gridLevel";
import { testDispatcherSlideWheel3x8Level } from "../../core/levels/test/testDispatcherSlideWheel3x8Level";
import { GRID_UNITS_PER_CELL } from "../../core/geometry/physicalGeometry";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  DispatchBoardController,
  type DispatchBoardControllerConfig,
  type WheelAnimationInstruction
} from "../game/DispatchBoardController";
import { createGridLayout, getGridCellLayout } from "../layout/gridLayout";
import { DispatcherView } from "../render/dispatcher/DispatcherView";
import { preloadDispatcherAssets } from "../render/dispatcher/dispatcherAssets";
import {
  createPearlTexture,
  getPearlTextureKey,
  preloadPearlAssets
} from "../render/pearl/pearlAssets";
import { SlideView } from "../render/slide/SlideView";
import { preloadSlideAssets } from "../render/slide/slideAssets";
import {
  createAutomaticWheelConnectorSlides,
  getDispatcherConnectorLayout,
  getDispatcherRightConnectorLayout
} from "../render/slide/slidePath";
import { WheelView } from "../render/wheel/WheelView";
import { preloadWheelAssets } from "../render/wheel/wheelAssets";

type ComponentCenter = Readonly<{
  x: number;
  y: number;
}>;

type TestBoardSceneConfig = Readonly<{
  level?: GridLevelDefinition;
  controller?: DispatchBoardControllerConfig;
}>;

export class TestBoardScene extends Phaser.Scene {
  private readonly level: GridLevelDefinition;
  private readonly controller: DispatchBoardController;
  private readonly controlledDispatcherId: string;

  private readonly componentCenters = new Map<string, ComponentCenter>();
  private readonly dispatcherViews = new Map<string, DispatcherView>();
  private readonly transitBalls = new Map<string, Phaser.GameObjects.Image>();
  private readonly clearingTransitBallIds = new Set<string>();
  private wheelView?: WheelView;
  private gridLayout?: ReturnType<typeof createGridLayout>;

  constructor(config: TestBoardSceneConfig = {}) {
    super("test-board");

    this.level = config.level ?? testDispatcherSlideWheel3x8Level;
    const controllerConfig = {
      ...createControllerConfigFromLevel(this.level),
      ...config.controller,
      dispatchers:
        config.controller?.dispatchers ?? createControllerConfigFromLevel(this.level).dispatchers
    };
    this.controller = new DispatchBoardController(controllerConfig);
    this.controlledDispatcherId =
      controllerConfig.dispatcherId ?? controllerConfig.dispatchers?.[0]?.id ?? "dispatcher-01";
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
    preloadDispatcherAssets(this);
    preloadSlideAssets(this);
    preloadPearlAssets(this);
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
            dispatchers: snapshot.dispatchers.map((dispatcher) => ({
              ...dispatcher,
              center: this.componentCenters.get(dispatcher.id)
            })),
            slide: {
              ...snapshot.slide,
              center: this.componentCenters.get(snapshot.slide.id)
            },
            wheel: {
              ...snapshot.wheel,
              center: this.componentCenters.get(snapshot.wheel.id),
              targetColors: snapshot.wheel.targetColors,
              ballCenter: this.wheelView?.getBallWorldPosition(snapshot.wheel.ballLocalSlotIndex) ?? null,
              pearlDiameter: (this.wheelView?.getBallVisualRadius() ?? 0) * 2,
              renderedSlots: this.wheelView?.getRenderedSlots() ?? [],
              targetIndicatorCenters: this.wheelView?.getTargetIndicatorPositions() ?? [],
              targetIndicatorRotations: this.wheelView?.getTargetIndicatorRotations() ?? [],
              clearEffect: this.wheelView?.getClearEffectState() ?? {
                active: false,
                targetCount: 0
              }
            }
          },
          transitInProgress: snapshot.transitInProgress,
          activeTransits: snapshot.activeTransits,
          transitVisuals: Object.fromEntries([...this.transitBalls].map(([ballId, image]) => [ballId, { diameter: image.displayWidth }])),
          lastHandoffEvent: snapshot.lastHandoffEvent,
          lastBounceEvent: snapshot.lastBounceEvent,
          lastBurnEvent: snapshot.lastBurnEvent,
          lastEvents: snapshot.lastEvents
        };
      },
      pressDispatcher: (dispatcherId?: string) => this.dispatchBall(dispatcherId),
      requestRotateTurn: () => this.rotateWheel(),
      ejectWheelPearl: (localSlotIndex: number) => this.ejectWheelBall(localSlotIndex),
      advanceTime: (deltaMs: number) => {
        this.controller.advanceTime(deltaMs);
        this.syncAuthoritativeVisuals();
      }
    });

    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", uninstallDebug);
  }

  update(_: number, deltaMs: number): void {
    const events = this.controller.advanceTime(deltaMs);

    const clearEvent = events.find((event) => event.type === "WHEEL_CLEARED");
    if (clearEvent?.type === "WHEEL_CLEARED") this.playWheelClearEffect(clearEvent.consumedBallIds);
    this.syncAuthoritativeVisuals();
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
        case "dispatcherDown":
          this.createDispatcher(layout, cell.component, cell, "down");
          break;
        case "dispatcherRight":
          this.createDispatcher(layout, cell.component, cell, "right");
          break;
        case "verticalSlide":
          this.createSlide(layout, cell.component, cell, "vertical");
          break;
        case "horizontalSlide":
          this.createSlide(layout, cell.component, cell, "horizontal");
          break;
        case "wheel":
          this.createWheel(layout, cell.component, cell);
          break;
      }
    }
  }

  private createDispatcher(
    layout: ReturnType<typeof createGridLayout>,
    component: DispatcherDownLevelComponent | DispatcherRightLevelComponent,
    cell: LevelCell,
    direction: "down" | "right"
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    if (direction === "down") {
      this.createDispatcherConnectorSlide(layout, cell);
    } else {
      this.createDispatcherRightConnectorSlide(layout, cell);
    }
    const maxSize = Math.min(cellLayout.width, cellLayout.height) * 0.94;

    const dispatcherView = new DispatcherView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      size: maxSize,
      direction,
      hasBall: component.hasInitialBall ?? true,
      ball: toInitialDispatcherBall(component),
      onPressed: () => this.dispatchBall(component.id)
    });

    this.dispatcherViews.set(component.id, dispatcherView);
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private createDispatcherConnectorSlide(
    layout: ReturnType<typeof createGridLayout>,
    dispatcherCell: LevelCell
  ): void {
    const cellLayout = getDispatcherConnectorLayout(layout, dispatcherCell);

    new SlideView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      width: cellLayout.width,
      height: cellLayout.height,
      direction: "vertical"
    });
  }

  private createDispatcherRightConnectorSlide(
    layout: ReturnType<typeof createGridLayout>,
    dispatcherCell: LevelCell
  ): void {
    const cellLayout = getDispatcherRightConnectorLayout(layout, dispatcherCell);

    new SlideView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      width: cellLayout.width,
      height: cellLayout.height,
      direction: "horizontal"
    });
  }

  private createSlide(
    layout: ReturnType<typeof createGridLayout>,
    component: VerticalSlideLevelComponent | HorizontalSlideLevelComponent,
    cell: LevelCell,
    direction: "horizontal" | "vertical"
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);

    new SlideView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      width: cellLayout.width,
      height: cellLayout.height,
      direction
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

    this.wheelView = new WheelView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      size: maxWheelSize,
      slotCount: component.slotCount,
      targetColors: component.clearRule?.type === "pattern" ? component.clearRule.targetColors : undefined,
      hasBall: false,
      ballLocalSlotIndex: null,
      onPressed: () => this.rotateWheel(),
      onBallPressed: (localSlotIndex) => this.ejectWheelBall(localSlotIndex)
    });
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private syncAuthoritativeVisuals(): void {
    const snapshot = this.controller.getSnapshot();

    if (!this.wheelView?.getClearEffectState().active) {
      this.wheelView?.setWheelSlots(snapshot.wheel.slots);
    }

    for (const dispatcher of snapshot.dispatchers) {
      this.dispatcherViews.get(dispatcher.id)?.setBall(dispatcher.ball);
    }

    const activeIds = new Set([
      ...snapshot.activeTransits.map((transit) => transit.ball.id),
      ...this.clearingTransitBallIds
    ]);
    for (const [ballId, image] of this.transitBalls) {
      if (!activeIds.has(ballId)) {
        image.destroy();
        this.transitBalls.delete(ballId);
      }
    }
    for (const transit of snapshot.activeTransits) {
      const position = this.toWorldPoint(transit.position);
      if (!position) continue;
      const image = this.transitBalls.get(transit.ball.id) ?? this.add.image(position.x, position.y, getPearlTextureKey(transit.ball.color));
      image.setTexture(getPearlTextureKey(transit.ball.color));
      image.setScale(this.wheelView?.getBallScale() ?? 1);
      image.setPosition(position.x, position.y);
      image.setVisible(true);
      this.transitBalls.set(transit.ball.id, image);
    }
  }

  private playWheelClearEffect(consumedBallIds: readonly string[]): void {
    if (!this.wheelView) return;
    const transitTargets = consumedBallIds
      .map((ballId) => this.transitBalls.get(ballId))
      .filter((image): image is Phaser.GameObjects.Image => Boolean(image));
    for (const ballId of consumedBallIds) {
      if (this.transitBalls.has(ballId)) this.clearingTransitBallIds.add(ballId);
    }
    this.wheelView.playClearEffect(() => {
      for (const ballId of this.clearingTransitBallIds) {
        this.transitBalls.get(ballId)?.destroy();
        this.transitBalls.delete(ballId);
      }
      this.clearingTransitBallIds.clear();
      this.syncAuthoritativeVisuals();
    }, transitTargets);
  }

  private toWorldPoint(point: Readonly<{ x: number; y: number }>): ComponentCenter | null {
    if (!this.gridLayout) return null;
    return { x: this.gridLayout.originX + point.x / GRID_UNITS_PER_CELL * this.gridLayout.cellWidth, y: this.gridLayout.originY + point.y / GRID_UNITS_PER_CELL * this.gridLayout.cellHeight };
  }

  private dispatchBall(dispatcherId = this.controlledDispatcherId): void {
    const instruction = this.controller.requestDispatch(dispatcherId);

    if (!instruction) {
      return;
    }

    this.syncAuthoritativeVisuals();
  }

  private ejectWheelBall(localSlotIndex: number): void {
    if (!this.controller.requestWheelEjection(localSlotIndex)) return;
    this.syncAuthoritativeVisuals();
  }

  private rotateWheel(): void {
    const instruction = this.controller.requestRotateWheel();

    if (instruction) {
      this.animateWheelTurn(instruction);
    }
  }

  private animateWheelTurn(_: WheelAnimationInstruction): void {
    if (!this.wheelView) {
      return;
    }

    this.wheelView.animateTurn(_, () => this.controller.completeWheelAnimation());
  }
}

function createControllerConfigFromLevel(level: GridLevelDefinition): DispatchBoardControllerConfig {
  const wheel = level.cells.find((cell) => cell.component.type === "wheel")?.component;

  if (!wheel || wheel.type !== "wheel") {
    throw new Error(`Level "${level.id}" requires a wheel component.`);
  }

  const dispatchers = level.cells
    .map((cell) => cell.component)
    .filter(
      (component): component is DispatcherDownLevelComponent | DispatcherRightLevelComponent =>
        component.type === "dispatcherDown" || component.type === "dispatcherRight"
    )
    .map((dispatcher) => {
      return {
        id: dispatcher.id,
        hasInitialBall: dispatcher.hasInitialBall,
        initialBall: dispatcher.initialBall,
        refillQueue: dispatcher.refillQueue
      };
    });

  return {
    level,
    dispatchers,
    wheelId: wheel.id,
    wheelSlotCount: wheel.slotCount,
    wheelClearRule: wheel.clearRule
  };
}

function toInitialDispatcherBall(
  component: DispatcherDownLevelComponent | DispatcherRightLevelComponent
): { id: string; color: "red" | "green" | "blue" } | null {
  if (component.initialBall) {
    return {
      id: component.initialBall.id ?? `${component.id}:ball`,
      color: component.initialBall.color
    };
  }

  if (component.hasInitialBall === false) {
    return null;
  }

  return {
    id: `${component.id}:ball`,
    color: "red"
  };
}
