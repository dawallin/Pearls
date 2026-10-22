/** Authoring-level refill choices. The simulation core owns their exact timing. */
export type RefillSpeed = "fast" | "slow";

export const REFILL_DELAY_MS_BY_SPEED: Readonly<Record<RefillSpeed, number>> = {
  fast: 250,
  slow: 2000
};

export function getRefillDelayMs(speed: RefillSpeed): number {
  return REFILL_DELAY_MS_BY_SPEED[speed];
}
