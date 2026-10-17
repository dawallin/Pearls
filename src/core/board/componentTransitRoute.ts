import {
  GRID_UNITS_PER_CELL,
  WHEEL_COMPONENT_SPAN_CELLS,
  WHEEL_SLOT_CENTER_RADIUS_GRID_UNITS
} from "../geometry/physicalGeometry";
import type { GridLevelDefinition, LevelCell } from "../level/gridLevel";

export type CorePoint = Readonly<{ x: number; y: number }>;
export type ComponentTransitSegment = Readonly<{
  id: string;
  componentId: string;
  componentType: "verticalSlide" | "horizontalSlide";
  entryEdge: "north" | "east" | "south" | "west";
  exitEdge: "north" | "east" | "south" | "west";
  entry: CorePoint;
  exit: CorePoint;
  length: number;
}>;
export type ComponentTransitRoute = Readonly<{
  id: string;
  segments: readonly ComponentTransitSegment[];
}>;

function point(column: number, row: number): CorePoint {
  return { x: column * GRID_UNITS_PER_CELL, y: row * GRID_UNITS_PER_CELL };
}

function center(cell: LevelCell): CorePoint {
  return point(cell.column + (cell.width ?? 1) / 2, cell.row + (cell.height ?? 1) / 2);
}

function wheelSlotPoint(wheel: LevelCell, facing: "top" | "right" | "bottom" | "left"): CorePoint {
  const wheelCenter = center(wheel);
  const scale = Math.min(wheel.width ?? 1, wheel.height ?? 1) / WHEEL_COMPONENT_SPAN_CELLS;
  const radius = WHEEL_SLOT_CENTER_RADIUS_GRID_UNITS * scale;
  if (facing === "left" || facing === "right") return { x: wheelCenter.x + (facing === "left" ? -radius : radius), y: wheelCenter.y };
  return { x: wheelCenter.x, y: wheelCenter.y + (facing === "top" ? -radius : radius) };
}

export type DispatcherTransitSegment = Readonly<{ entry: CorePoint; exit: CorePoint; length: number }>;
export type DispatcherComponentTransitRoute = Readonly<{
  dispatcherId: string;
  wheelId: string;
  segments: readonly ComponentTransitSegment[];
}>;

/** Builds the exact placed slide chain between one dispatcher and its wheel. */
export function buildDispatcherComponentTransitRoute(
  level: GridLevelDefinition,
  dispatcherId: string,
  wheelId: string
): DispatcherComponentTransitRoute {
  const dispatcher = level.cells.find((cell) =>
    (cell.component.type === "dispatcherDown" || cell.component.type === "dispatcherRight") &&
    cell.component.id === dispatcherId
  );
  const wheel = level.cells.find((cell) => cell.component.type === "wheel" && cell.component.id === wheelId);
  if (!dispatcher || !wheel) throw new Error(`Dispatcher route requires "${dispatcherId}" and wheel "${wheelId}".`);

  const isVertical = dispatcher.component.type === "dispatcherDown";
  const expectedType = isVertical ? "verticalSlide" : "horizontalSlide";
  const dispatcherFarEdge = isVertical
    ? dispatcher.row + (dispatcher.height ?? 1)
    : dispatcher.column + (dispatcher.width ?? 1);
  const wheelNearEdge = isVertical ? wheel.row : wheel.column;
  const crossAxis = isVertical
    ? dispatcher.column + (dispatcher.width ?? 1) / 2 - 0.5
    : dispatcher.row + (dispatcher.height ?? 1) / 2 - 0.5;

  const slides = level.cells
    .filter((cell) => cell.component.type === expectedType)
    .filter((cell) => (isVertical ? cell.column : cell.row) === crossAxis)
    .filter((cell) => {
      const start = isVertical ? cell.row : cell.column;
      return start >= dispatcherFarEdge && start < wheelNearEdge;
    })
    .sort((left, right) => {
      const leftAxis = isVertical ? left.row : left.column;
      const rightAxis = isVertical ? right.row : right.column;
      return leftAxis - rightAxis || left.component.id.localeCompare(right.component.id);
    });

  if (slides.length === 0) throw new Error(`Dispatcher "${dispatcherId}" requires a connected ${expectedType} chain.`);
  let expectedAxis = dispatcherFarEdge;
  for (const slide of slides) {
    const axis = isVertical ? slide.row : slide.column;
    if (axis !== expectedAxis) throw new Error(`Dispatcher "${dispatcherId}" slide chain must be consecutive.`);
    expectedAxis += isVertical ? (slide.height ?? 1) : (slide.width ?? 1);
  }
  if (expectedAxis !== wheelNearEdge) throw new Error(`Dispatcher "${dispatcherId}" slide chain must connect directly to wheel "${wheelId}".`);

  const routeEntry = center(dispatcher);
  const routeExit = wheelSlotPoint(wheel, isVertical ? "top" : "left");
  const segments = slides.map((slide, index): ComponentTransitSegment => {
    const entry = index === 0
      ? routeEntry
      : isVertical
        ? point(slide.column + 0.5, slide.row)
        : point(slide.column, slide.row + 0.5);
    const exit = index === slides.length - 1
      ? routeExit
      : isVertical
        ? point(slide.column + 0.5, slide.row + (slide.height ?? 1))
        : point(slide.column + (slide.width ?? 1), slide.row + 0.5);
    return {
      id: `segment:${slide.component.id}`,
      componentId: slide.component.id,
      componentType: expectedType,
      entryEdge: isVertical ? "north" : "west",
      exitEdge: isVertical ? "south" : "east",
      entry,
      exit,
      length: distance(entry, exit)
    };
  });
  return { dispatcherId, wheelId, segments };
}

function distance(entry: CorePoint, exit: CorePoint): number {
  return Math.hypot(exit.x - entry.x, exit.y - entry.y);
}

/** Builds one ordered vertical-slide route from declarative level component placement. */
export function buildVerticalComponentTransitRoute(
  level: GridLevelDefinition,
  topWheelId: string,
  bottomWheelId: string
): ComponentTransitRoute {
  const topWheel = level.cells.find((cell) => cell.component.type === "wheel" && cell.component.id === topWheelId);
  const bottomWheel = level.cells.find((cell) => cell.component.type === "wheel" && cell.component.id === bottomWheelId);
  if (!topWheel || !bottomWheel) throw new Error("Transit route requires both configured wheel components.");
  const slides = level.cells
    .filter((cell): cell is LevelCell & { component: Readonly<{ type: "verticalSlide"; id: string }> } => cell.component.type === "verticalSlide")
    .filter((cell) => cell.column === topWheel.column + (topWheel.width ?? 1) / 2 - 0.5)
    .filter((cell) => cell.row >= topWheel.row + (topWheel.height ?? 1) && cell.row < bottomWheel.row)
    .sort((left, right) => left.row - right.row || left.component.id.localeCompare(right.component.id));
  if (slides.length === 0) throw new Error("Transit route requires at least one connected verticalSlide component.");
  for (let index = 1; index < slides.length; index += 1) {
    if (slides[index].row !== slides[index - 1].row + (slides[index - 1].height ?? 1)) {
      throw new Error("Transit route verticalSlide components must be consecutive.");
    }
  }
  if (slides[0].row !== topWheel.row + (topWheel.height ?? 1) || slides.at(-1)!.row + (slides.at(-1)!.height ?? 1) !== bottomWheel.row) {
    throw new Error("Transit route slides must connect directly between the two wheels.");
  }
  const topSlot = wheelSlotPoint(topWheel, "bottom");
  const bottomSlot = wheelSlotPoint(bottomWheel, "top");
  const segments = slides.map((slide, index) => {
    const entry = index === 0 ? topSlot : point(slide.column + 0.5, slide.row);
    const exit = index === slides.length - 1 ? bottomSlot : point(slide.column + 0.5, slide.row + (slide.height ?? 1));
    return { id: `segment:${slide.component.id}`, componentId: slide.component.id, componentType: "verticalSlide" as const, entryEdge: "north" as const, exitEdge: "south" as const, entry, exit, length: distance(entry, exit) };
  });
  return { id: `route:${topWheelId}:${bottomWheelId}`, segments };
}
