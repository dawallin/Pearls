export type GridCellCoordinate = Readonly<{
  column: number;
  row: number;
}>;

export type GridCellSpan = Readonly<{
  width?: number;
  height?: number;
}>;

export type WheelLevelComponent = Readonly<{
  type: "wheel";
  id: string;
  slotCount: number;
}>;

export type DispatcherDownLevelComponent = Readonly<{
  type: "dispatcherDown";
  id: string;
  hasInitialBall: boolean;
}>;

export type DispatcherRightLevelComponent = Readonly<{
  type: "dispatcherRight";
  id: string;
  hasInitialBall: boolean;
}>;

export type VerticalSlideLevelComponent = Readonly<{
  type: "verticalSlide";
  id: string;
}>;

export type HorizontalSlideLevelComponent = Readonly<{
  type: "horizontalSlide";
  id: string;
}>;

export type LevelComponent =
  | WheelLevelComponent
  | DispatcherDownLevelComponent
  | DispatcherRightLevelComponent
  | VerticalSlideLevelComponent
  | HorizontalSlideLevelComponent;

export type LevelCell = GridCellCoordinate &
  GridCellSpan &
  Readonly<{
    component: LevelComponent;
  }>;

export type GridLevelDefinition = Readonly<{
  id: string;
  name: string;
  columns: number;
  rows: number;
  cells: readonly LevelCell[];
}>;

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export function createGridLevelDefinition(
  definition: GridLevelDefinition
): GridLevelDefinition {
  assertPositiveInteger(definition.columns, "Level columns");
  assertPositiveInteger(definition.rows, "Level rows");

  const occupiedCells = new Set<string>();

  for (const cell of definition.cells) {
    const spanWidth = cell.width ?? 1;
    const spanHeight = cell.height ?? 1;

    if (!Number.isInteger(cell.column) || cell.column < 0 || cell.column >= definition.columns) {
      throw new Error(`Cell column ${cell.column} is outside level bounds.`);
    }

    if (!Number.isInteger(cell.row) || cell.row < 0 || cell.row >= definition.rows) {
      throw new Error(`Cell row ${cell.row} is outside level bounds.`);
    }

    assertPositiveInteger(spanWidth, `Component "${cell.component.id}" width`);
    assertPositiveInteger(spanHeight, `Component "${cell.component.id}" height`);

    if (cell.column + spanWidth > definition.columns) {
      throw new Error(`Component "${cell.component.id}" extends outside level columns.`);
    }

    if (cell.row + spanHeight > definition.rows) {
      throw new Error(`Component "${cell.component.id}" extends outside level rows.`);
    }

    for (let row = cell.row; row < cell.row + spanHeight; row += 1) {
      for (let column = cell.column; column < cell.column + spanWidth; column += 1) {
        const key = `${column}:${row}`;

        if (occupiedCells.has(key)) {
          throw new Error(`Duplicate component placement at cell ${key}.`);
        }

        occupiedCells.add(key);
      }
    }

    switch (cell.component.type) {
      case "wheel":
        assertPositiveInteger(cell.component.slotCount, `Wheel "${cell.component.id}" slotCount`);
        break;
      case "dispatcherDown":
      case "dispatcherRight":
      case "verticalSlide":
      case "horizontalSlide":
        break;
    }
  }

  return definition;
}
