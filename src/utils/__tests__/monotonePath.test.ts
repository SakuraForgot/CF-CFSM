import { describe, expect, it } from "vitest";
import { monotonePath } from "../monotonePath";

describe("monotone chart rendering", () => {
  it("handles empty and single-sample series without inventing a curve", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 2, y: 9 }])).toBe("M2,9");
  });

  it("passes through every sample and never overshoots sharp peaks on uneven timestamps", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 100 }, { x: 40, y: 2 },
      { x: 41, y: 2 }, { x: 200, y: 70 }, { x: 201, y: 0 }];
    const path = monotonePath(points);
    const segments = path.split(" C").slice(1);
    expect(segments).toHaveLength(points.length - 1);
    segments.forEach((segment, i) => {
      const [x1, y1, x2, y2, x3, y3] = segment.split(/[ ,]/).map(Number);
      const a = points[i], b = points[i + 1];
      expect([x3, y3]).toEqual([b.x, b.y]);
      expect(x1).toBeGreaterThan(a.x);
      expect(x2).toBeLessThan(b.x);
      for (let j = 0; j <= 100; j++) {
        const t = j / 100, u = 1 - t;
        const y = u ** 3 * a.y + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3;
        expect(y).toBeGreaterThanOrEqual(Math.min(a.y, b.y) - 1e-9);
        expect(y).toBeLessThanOrEqual(Math.max(a.y, b.y) + 1e-9);
      }
    });
  });
});
