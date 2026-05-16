export type PearlsDebugSurface<TSnapshot> = {
  getSnapshot: () => TSnapshot;
  pressDispatcher: (dispatcherId?: string) => void;
  requestRotateTurn: (wheelId?: string) => void;
};

declare global {
  var __PEARLS__: PearlsDebugSurface<unknown> | undefined;
}

export function installPearlsDebug<TSnapshot>(
  surface: PearlsDebugSurface<TSnapshot>
): () => void {
  globalThis.__PEARLS__ = surface as PearlsDebugSurface<unknown>;

  return () => {
    if (globalThis.__PEARLS__ === surface) {
      globalThis.__PEARLS__ = undefined;
    }
  };
}
