import type {
  GridCellCoordinate,
  GridCellSpan,
  GridLevelDefinition
} from "../../core/level/gridLevel";

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
  cell: GridCellCoordinate & GridCellSpan
): GridCellLayout {
  const spanWidth = cell.width ?? 1;
  const spanHeight = cell.height ?? 1;

  return {
    column: cell.column,
    row: cell.row,
    centerX: layout.originX + layout.cellWidth * (cell.column + spanWidth / 2),
    centerY: layout.originY + layout.cellHeight * (cell.row + spanHeight / 2),
    width: layout.cellWidth * spanWidth,
    height: layout.cellHeight * spanHeight
  };
}
