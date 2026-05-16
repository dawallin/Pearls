import type { GridCellCoordinate, GridLevelDefinition } from "../../core/level/gridLevel";

export type GridCellLayout = GridCellCoordinate &
  Readonly<{
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  }>;

export type GridLayout = Readonly<{
  originX: number;
  originY: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
}>;

export function createGridLayout(
  level: GridLevelDefinition,
  viewportWidth: number,
  viewportHeight: number
): GridLayout {
  const sidePadding = Math.min(viewportWidth, viewportHeight) * 0.12;
  const topPadding = 108;
  const bottomPadding = 88;
  const availableWidth = Math.max(120, viewportWidth - sidePadding * 2);
  const availableHeight = Math.max(120, viewportHeight - topPadding - bottomPadding);
  const layoutSize = Math.min(availableWidth / level.columns, availableHeight / level.rows);
  const width = layoutSize * level.columns;
  const height = layoutSize * level.rows;

  return {
    originX: (viewportWidth - width) / 2,
    originY: topPadding + (availableHeight - height) / 2,
    width,
    height,
    cellWidth: width / level.columns,
    cellHeight: height / level.rows
  };
}

export function getGridCellLayout(
  layout: GridLayout,
  cell: GridCellCoordinate
): GridCellLayout {
  return {
    column: cell.column,
    row: cell.row,
    centerX: layout.originX + layout.cellWidth * (cell.column + 0.5),
    centerY: layout.originY + layout.cellHeight * (cell.row + 0.5),
    width: layout.cellWidth,
    height: layout.cellHeight
  };
}
