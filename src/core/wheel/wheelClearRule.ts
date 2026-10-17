import type { BallColor, BallId, BallState } from "../ball/ballState";

export type WheelClearRule = Readonly<{
  type: "harmony";
}>;

export type WheelClearMatch = Readonly<{
  color: BallColor;
  consumedBallIds: readonly BallId[];
}>;

export function evaluateWheelClearRule(
  clearRule: WheelClearRule | undefined,
  slots: readonly (BallId | null)[],
  balls: Readonly<Record<BallId, BallState>>
): WheelClearMatch | null {
  if (!clearRule || slots.some((ballId) => ballId === null)) {
    return null;
  }

  switch (clearRule.type) {
    case "harmony": {
      const consumedBallIds = slots as readonly BallId[];
      const firstBall = balls[consumedBallIds[0]];

      if (!firstBall) {
        throw new Error(`Unknown wheel ball "${consumedBallIds[0]}".`);
      }

      if (
        consumedBallIds.some((ballId) => {
          const ball = balls[ballId];
          return !ball || ball.color !== firstBall.color;
        })
      ) {
        return null;
      }

      return {
        color: firstBall.color,
        consumedBallIds: [...consumedBallIds]
      };
    }
  }
}
