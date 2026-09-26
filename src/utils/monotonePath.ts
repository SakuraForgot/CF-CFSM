export interface PlotPoint { x: number; y: number }

/** Monotone cubic interpolation: preserve samples and bound every segment by its endpoints. */
export function monotonePath(points: PlotPoint[]): string {
  if (!points.length) return "";
  const start = `M${points[0].x},${points[0].y}`;
  if (points.length === 1) return start;
  const slopes = points.slice(1).map((point, i) =>
    (point.y - points[i].y) / (point.x - points[i].x));
  const tangents = points.map((_, i) => i === 0 ? slopes[0]
    : i === points.length - 1 ? slopes[i - 1]
      : slopes[i - 1] * slopes[i] <= 0 ? 0
        : 2 / (1 / slopes[i - 1] + 1 / slopes[i]));
  // Limit the tangent vector so extrema never overshoot measured values.
  slopes.forEach((slope, i) => {
    if (slope === 0) { tangents[i] = 0; tangents[i + 1] = 0; return; }
    const magnitude = Math.hypot(tangents[i] / slope, tangents[i + 1] / slope);
    if (magnitude > 3) {
      const scale = 3 / magnitude;
      tangents[i] *= scale;
      tangents[i + 1] *= scale;
    }
  });
  return start + points.slice(1).map((point, i) => {
    const previous = points[i];
    const dx = (point.x - previous.x) / 3;
    return ` C${previous.x + dx},${previous.y + dx * tangents[i]} ${point.x - dx},${point.y - dx * tangents[i + 1]} ${point.x},${point.y}`;
  }).join("");
}
