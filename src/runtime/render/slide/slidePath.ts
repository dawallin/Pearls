import type { LevelCell } from "../../../core/level/gridLevel";
import type { GridCellLayout, GridLayout } from "../../layout/gridLayout";
import { getGridCellLayout } from "../../layout/gridLayout";

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
