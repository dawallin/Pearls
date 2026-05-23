import type { GridLevelDefinition, LevelCell } from "../../../core/level/gridLevel";
import type { GridCellLayout, GridLayout } from "../../layout/gridLayout";
import { getGridCellLayout } from "../../layout/gridLayout";
import { SlideView } from "./SlideView";

type SlideDirection = "horizontal" | "vertical";

type WheelConnectorSlide = Readonly<{
  cell: Pick<LevelCell, "column" | "row">;
  direction: SlideDirection;
}>;

export function deriveWheelConnectorCell(wheelCell: LevelCell): Pick<LevelCell, "column" | "row"> {
  const wheelSpanWidth = wheelCell.width ?? 1;

  return {
    column: wheelCell.column + Math.floor(wheelSpanWidth / 2),
    row: wheelCell.row
  };
}

export function deriveWheelLeftConnectorCell(
  wheelCell: LevelCell
): Pick<LevelCell, "column" | "row"> {
  const wheelSpanHeight = wheelCell.height ?? 1;

  return {
    column: wheelCell.column,
    row: wheelCell.row + Math.floor(wheelSpanHeight / 2)
  };
}

export function deriveDispatcherConnectorCell(
  dispatcherCell: LevelCell
): Pick<LevelCell, "column" | "row"> {
  const dispatcherSpanWidth = dispatcherCell.width ?? 1;
  const dispatcherSpanHeight = dispatcherCell.height ?? 1;

  return {
    column: dispatcherCell.column + Math.floor(dispatcherSpanWidth / 2),
    row: dispatcherCell.row + dispatcherSpanHeight - 1
  };
}

export function deriveDispatcherRightConnectorCell(
  dispatcherCell: LevelCell
): Pick<LevelCell, "column" | "row"> {
  const dispatcherSpanWidth = dispatcherCell.width ?? 1;
  const dispatcherSpanHeight = dispatcherCell.height ?? 1;

  return {
    column: dispatcherCell.column + dispatcherSpanWidth - 1,
    row: dispatcherCell.row + Math.floor(dispatcherSpanHeight / 2)
  };
}

export function getDispatcherConnectorLayout(
  layout: GridLayout,
  dispatcherCell: LevelCell
): GridCellLayout {
  return getGridCellLayout(layout, deriveDispatcherConnectorCell(dispatcherCell));
}

export function getDispatcherRightConnectorLayout(
  layout: GridLayout,
  dispatcherCell: LevelCell
): GridCellLayout {
  return getGridCellLayout(layout, deriveDispatcherRightConnectorCell(dispatcherCell));
}

export function getWheelConnectorLayout(
  layout: GridLayout,
  wheelCell: LevelCell
): GridCellLayout {
  return getGridCellLayout(layout, deriveWheelConnectorCell(wheelCell));
}

export function getWheelLeftConnectorLayout(
  layout: GridLayout,
  wheelCell: LevelCell
): GridCellLayout {
  return getGridCellLayout(layout, deriveWheelLeftConnectorCell(wheelCell));
}

export function createAutomaticWheelConnectorSlides(
  scene: Phaser.Scene,
  layout: GridLayout,
  level: GridLevelDefinition,
  wheelCell: LevelCell
): void {
  for (const connector of deriveAutomaticWheelConnectorSlides(level, wheelCell)) {
    const cellLayout = getGridCellLayout(layout, connector.cell);

    new SlideView(scene, {
      x: cellLayout.centerX,
      y: cellLayout.centerY,
      width: cellLayout.width,
      height: cellLayout.height,
      direction: connector.direction
    });
  }
}

export function deriveAutomaticWheelConnectorSlides(
  level: GridLevelDefinition,
  wheelCell: LevelCell
): readonly WheelConnectorSlide[] {
  const connectors: WheelConnectorSlide[] = [];
  const wheelSpanWidth = wheelCell.width ?? 1;
  const wheelSpanHeight = wheelCell.height ?? 1;
  const centerColumn = wheelCell.column + Math.floor(wheelSpanWidth / 2);
  const centerRow = wheelCell.row + Math.floor(wheelSpanHeight / 2);
  const topRow = wheelCell.row;
  const bottomRow = wheelCell.row + wheelSpanHeight - 1;
  const leftColumn = wheelCell.column;
  const rightColumn = wheelCell.column + wheelSpanWidth - 1;

  if (hasSlideCell(level, centerColumn, wheelCell.row - 1, "verticalSlide")) {
    connectors.push({
      cell: {
        column: centerColumn,
        row: topRow
      },
      direction: "vertical"
    });
  }

  if (hasSlideCell(level, centerColumn, wheelCell.row + wheelSpanHeight, "verticalSlide")) {
    connectors.push({
      cell: {
        column: centerColumn,
        row: bottomRow
      },
      direction: "vertical"
    });
  }

  if (hasSlideCell(level, wheelCell.column - 1, centerRow, "horizontalSlide")) {
    connectors.push({
      cell: {
        column: leftColumn,
        row: centerRow
      },
      direction: "horizontal"
    });
  }

  if (hasSlideCell(level, wheelCell.column + wheelSpanWidth, centerRow, "horizontalSlide")) {
    connectors.push({
      cell: {
        column: rightColumn,
        row: centerRow
      },
      direction: "horizontal"
    });
  }

  return connectors;
}

function hasSlideCell(
  level: GridLevelDefinition,
  column: number,
  row: number,
  type: "horizontalSlide" | "verticalSlide"
): boolean {
  return level.cells.some((cell) => {
    const spanWidth = cell.width ?? 1;
    const spanHeight = cell.height ?? 1;

    return (
      cell.component.type === type &&
      column >= cell.column &&
      column < cell.column + spanWidth &&
      row >= cell.row &&
      row < cell.row + spanHeight
    );
  });
}
