export type BallColor = "red" | "green" | "blue";
export type BallId = string;

export type BallState = Readonly<{
  id: BallId;
  color: BallColor;
}>;

export type BallSeed = Readonly<{
  id?: BallId;
  color: BallColor;
}>;

export type BallSnapshot = BallState;
