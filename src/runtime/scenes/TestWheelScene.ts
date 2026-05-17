import Phaser from "phaser";

import { testWheel3x3Level } from "../../core/levels/test/testWheel3x3Level";
import type { LevelCell, WheelLevelComponent } from "../../core/level/gridLevel";
import { installPearlsDebug } from "../debug/installPearlsDebug";
import {
  WheelController,
  type WheelAnimationInstruction
} from "../game/WheelController";
import { createGridLayout, getGridCellLayout } from "../layout/gridLayout";
import { createPearlTexture, preloadPearlAssets } from "../render/pearl/pearlAssets";
import { WheelView } from "../render/wheel/WheelView";
import { preloadWheelAssets } from "../render/wheel/wheelAssets";

export class TestWheelScene extends Phaser.Scene {
  private readonly level = testWheel3x3Level;
  private readonly controller = new WheelController({
    wheelId: "wheel-01",
    slotCount: 8
  });
  private wheelView?: WheelView;

  constructor() {
    super("test-wheel");
  }

  preload(): void {
    this.load.setBaseURL(import.meta.env.BASE_URL);
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
      .text(width / 2, height - 42, "Click the wheel and inspect the smooth quarter-step rotation.", {
        color: "#d6d0c1",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: "18px"
      })
      .setOrigin(0.5);

    this.drawGrid(layout);
    this.createWheel(layout, this.level.cells[0].component as WheelLevelComponent, this.level.cells[0]);

    const uninstallDebug = installPearlsDebug({
      getSnapshot: () => ({
        levelId: this.level.id,
        levelName: this.level.name,
        grid: {
          columns: this.level.columns,
          rows: this.level.rows
        },
        wheel: this.controller.getSnapshot(this.wheelView?.rotation ?? 0)
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

  private createWheel(
    layout: ReturnType<typeof createGridLayout>,
    component: WheelLevelComponent,
    cell: LevelCell
  ): void {
    const cellLayout = getGridCellLayout(layout, cell);
    const maxWheelSize = Math.min(cellLayout.width, cellLayout.height) * 0.94;

    this.wheelView = new WheelView(this, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      size: maxWheelSize,
      slotCount: component.slotCount,
      hasBall: true,
      ballLocalSlotIndex: 0,
      onPressed: () => this.rotateWheel()
    });
  }

  private rotateWheel(): void {
    const instruction = this.controller.requestRotateTurn();

    if (instruction) {
      this.animateWheelTurn(instruction);
    }
  }

  private animateWheelTurn(instruction: WheelAnimationInstruction): void {
    if (!this.wheelView) {
      return;
    }

    this.wheelView.animateTurn(instruction, () =>
      this.controller.completeAnimation()
    );
  }
}
