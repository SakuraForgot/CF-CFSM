import { describe, expect, it } from "vitest";
import { appendTrafficPoint } from "../OverviewTrafficChart";

describe("overview traffic evidence", () => {
  it("starts with only the received sample, without fabricated history", () => {
    const sample = { time: 1000, up: 12, down: 25 };
    expect(appendTrafficPoint([], sample)).toEqual([sample]);
  });
  it("ignores invalid samples and duplicate renders, and bounds session history", () => {
    let points = [{ time: 1000, up: 12, down: 25 }];
    expect(appendTrafficPoint(points, { time: 2000, up: NaN, down: 25 })).toBe(points);
    expect(appendTrafficPoint(points, { time: 2000, up: 12, down: 25 })).toBe(points);
    expect(appendTrafficPoint(points, { time: 1000, up: 99, down: 10 })).toBe(points);
    expect(appendTrafficPoint(points, { time: 999, up: 99, down: 10 })).toBe(points);
    for (let i = 1; i <= 50; i++) points = appendTrafficPoint(points, { time: 1000 + i, up: i, down: i });
    expect(points).toHaveLength(40);
    expect(points[0].time).toBe(1011);
    expect(points.at(-1)?.time).toBe(1050);
  });
});
