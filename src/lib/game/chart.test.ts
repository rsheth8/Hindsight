import { describe, expect, it } from "vitest";
import { alignContinuation } from "./chart";

describe("alignContinuation", () => {
  it("leaves continuation unchanged when already aligned", () => {
    const series = [{ t: 0, v: 100 }, { t: 126, v: 110 }];
    const continuation = [{ t: 126, v: 110 }, { t: 127, v: 112 }];
    expect(alignContinuation(series, continuation)).toEqual(continuation);
  });

  it("shifts continuation to follow a truncated series", () => {
    const series = [{ t: 0, v: 100 }, { t: 41, v: 160 }];
    const continuation = [{ t: 126, v: 116 }, { t: 127, v: 118 }];
    expect(alignContinuation(series, continuation)).toEqual([
      { t: 41, v: 116 },
      { t: 42, v: 118 },
    ]);
  });
});
