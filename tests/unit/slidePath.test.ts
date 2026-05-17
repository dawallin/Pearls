import { describe, expect, it } from "vitest";

import {
  deriveDispatcherConnectorCell,
  deriveWheelConnectorCell
} from "../../src/runtime/render/slide/slidePath";

describe("slidePath", () => {
  it("derives the top-middle connector cell for a 3x3 wheel span", () => {
    expect(
      deriveWheelConnectorCell({
        column: 0,
        row: 5,
        width: 3,
        height: 3,
        component: {
          type: "wheel",
          id: "wheel-a",
          slotCount: 8
        }
      })
    ).toEqual({
      column: 1,
      row: 5
    });
  });

  it("derives the lower-middle connector cell for a 3x3 dispatcher span", () => {
    expect(
      deriveDispatcherConnectorCell({
        column: 0,
        row: 0,
        width: 3,
        height: 3,
        component: {
          type: "dispatcherDown",
          id: "dispatcher-a",
          hasInitialBall: true
        }
      })
    ).toEqual({
      column: 1,
      row: 2
    });
  });
});
