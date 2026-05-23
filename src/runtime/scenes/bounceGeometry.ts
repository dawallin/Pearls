export type Point = Readonly<{
  x: number;
  y: number;
}>;

export function getBounceContactPoint(
  sourceCenter: Point,
  targetCenter: Point,
  sourceRadius: number,
  targetRadius: number,
  penetrationFactor = 0
): Point {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const distance = Math.hypot(dx, dy);
  const penetration = Math.min(sourceRadius, targetRadius) * Math.max(0, penetrationFactor);
  const minimumSeparation = Math.max(0, sourceRadius + targetRadius - penetration);

  if (distance <= 0 || minimumSeparation <= 0) {
    return sourceCenter;
  }

  const travelDistance = Math.max(0, distance - minimumSeparation);

  return {
    x: sourceCenter.x + (dx / distance) * travelDistance,
    y: sourceCenter.y + (dy / distance) * travelDistance
  };
}
