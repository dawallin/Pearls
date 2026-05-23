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

const DISPATCH_DURATION_MS = 520;

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
  private transitBall?: Phaser.GameObjects.Image;
  private wheelView?: WheelView;

  constructor(config: TestBoardSceneConfig = {}) {
    super("test-board");

    const controllerConfig = config.controller ?? {
      dispatcherId: "dispatcher-01",
      slideId: "slide-01-a",
      wheelId: "wheel-01",
      wheelSlotCount: 8,
      dispatcherHasInitialBall: true
    };

    this.level = config.level ?? testDispatcherSlideWheel3x8Level;
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
              center: this.componentCenters.get(snapshot.wheel.id)
            }
          },
          transitInProgress: snapshot.transitInProgress,
          lastEvents: snapshot.lastEvents
        };
      },
      pressDispatcher: (dispatcherId?: string) => this.dispatchBall(dispatcherId),
      requestRotateTurn: () => this.rotateWheel(),
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

    if (events.some((event) => event.type === "DISPATCHER_REFILLED")) {
      this.syncAuthoritativeVisuals();
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
      hasBall: false,
      ballLocalSlotIndex: null,
      onPressed: () => this.rotateWheel()
    });
    this.componentCenters.set(component.id, {
      x: cellLayout.centerX,
      y: cellLayout.centerY
    });
  }

  private syncAuthoritativeVisuals(): void {
    const snapshot = this.controller.getSnapshot();

    this.wheelView?.setWheelSlots(snapshot.transitInProgress ? [] : snapshot.wheel.slots);

    for (const dispatcher of snapshot.dispatchers) {
      this.dispatcherViews.get(dispatcher.id)?.setBall(dispatcher.ball);
    }
  }

  private dispatchBall(dispatcherId = this.controlledDispatcherId): void {
    const instruction = this.controller.requestDispatch(dispatcherId);

    if (!instruction) {
      return;
    }

    const wheelCenter = this.componentCenters.get(instruction.wheelId);
    const dispatcherView = this.dispatcherViews.get(instruction.dispatcherId);
    const dispatcherBallPosition = dispatcherView?.getBallWorldPosition();

    if (!dispatcherBallPosition || !wheelCenter || !this.wheelView || !dispatcherView) {
      return;
    }

    const snapshot = this.controller.getSnapshot();

    dispatcherView.setBallVisible(false);
    this.wheelView.setWheelSlots(
      snapshot.wheel.slots.map((occupantId, index) =>
        index === instruction.targetLocalSlotIndex ? null : occupantId
      )
    );

    if (!this.transitBall) {
      this.transitBall = this.add.image(
        dispatcherBallPosition.x,
        dispatcherBallPosition.y,
        getPearlTextureKey(instruction.ball.color)
      );
    }

    this.transitBall.setTexture(getPearlTextureKey(instruction.ball.color));
    this.transitBall.setScale(dispatcherView.getBallScale());
    this.transitBall.setPosition(dispatcherBallPosition.x, dispatcherBallPosition.y);
    this.transitBall.setVisible(true);

    const wheelBallWorldPosition = this.getWheelBallWorldPosition(
      instruction.targetLocalSlotIndex
    );

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

  private getWheelBallWorldPosition(localSlotIndex: number): ComponentCenter | null {
    return this.wheelView?.getBallWorldPosition(localSlotIndex) ?? null;
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
