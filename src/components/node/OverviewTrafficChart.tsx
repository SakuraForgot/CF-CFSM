import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { monotonePath } from "@/utils/monotonePath";
import { formatByteRateLabel } from "@/utils/format";

export interface TrafficPoint {
  time: number;
  up: number;
  down: number;
}
export function appendTrafficPoint(
  points: TrafficPoint[],
  point: TrafficPoint,
): TrafficPoint[] {
  if (
    !Number.isFinite(point.time) ||
    !Number.isFinite(point.up) ||
    !Number.isFinite(point.down) ||
    point.up < 0 ||
    point.down < 0
  )
    return points;
  const last = points.at(-1);
  if (last && (point.time <= last.time || (last.up === point.up && last.down === point.down))) return points;
  return [...points, point].slice(-40);
}

function TrafficPlot({ points, metric, ceiling }: {
  points: TrafficPoint[]; metric: "up" | "down"; ceiling: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const id = useId().replaceAll(":", "");
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(180, Math.round(element.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const left = 64, right = width - 12, top = 14, bottom = 110;
  const firstTime = points[0]?.time ?? 0;
  const timeSpan = Math.max(1, (points.at(-1)?.time ?? 0) - firstTime);
  const path = monotonePath(points.map((point) => ({
    x: left + ((point.time - firstTime) / timeSpan) * (right - left),
    y: bottom - (point[metric] / ceiling) * (bottom - top),
  })));
  const tickCount = width < 420 ? 2 : 4;
  return (
    <div className="cf-traffic-plot" ref={host}>
      <svg width={width} height="140" viewBox={`0 0 ${width} 140`} role="img"
        aria-label={points.length < 2 ? "等待更多网络吞吐采样" : `当前会话${metric === "up" ? "上行" : "下行"}吞吐曲线`}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--cf-chart-line)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--cf-chart-line)" stopOpacity=".025" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const y = top + i * (bottom - top) / 3;
          return <g key={i}>
            <line x1={left} x2={right} y1={y} y2={y} className="cf-chart-grid" />
            <text x={left - 10} y={y + 4} textAnchor="end">{formatByteRateLabel(ceiling * (3 - i) / 3)}</text>
          </g>;
        })}
        {points.length > 1 && <>
          <path d={`${path} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#${id}-area)`} />
          <path d={path} className="cf-traffic-line" fill="none" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          {Array.from({ length: tickCount }, (_, index) => {
            const fraction = index / (tickCount - 1);
            const x = left + fraction * (right - left);
            return <g key={index}>
              <line x1={x} x2={x} y1={bottom} y2={bottom + 5} className="cf-chart-tick" />
              <text x={x} y="133" textAnchor={index === 0 ? "start" : index === tickCount - 1 ? "end" : "middle"}>
                {new Date(firstTime + fraction * timeSpan).toLocaleTimeString("zh-CN", { hour12: false })}
              </text>
            </g>;
          })}
        </>}
      </svg>
      {points.length < 2 && <div className="cf-chart-waiting">等待更多采样</div>}
    </div>
  );
}

export function OverviewTrafficChart({
  netUp,
  netDown,
}: {
  netUp: number;
  netDown: number;
}) {
  const [points, setPoints] = useState<TrafficPoint[]>([]);
  useEffect(() => {
    setPoints((previous) =>
      appendTrafficPoint(previous, {
        time: Date.now(),
        up: netUp,
        down: netDown,
      }),
    );
  }, [netUp, netDown]);
  const ceiling =
    Math.max(1024, ...points.flatMap((p) => [p.up, p.down])) * 1.2;
  return (
    <div className="cf-chart">
      {(["up", "down"] as const).map((metric) => (
        <div className="cf-traffic-row" key={metric}>
          <div className="cf-traffic-summary">
            <span>{metric === "up" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              {metric === "up" ? "上行" : "下行"}</span>
            <strong>{formatByteRateLabel(metric === "up" ? netUp : netDown)}</strong>
          </div>
          <TrafficPlot points={points} metric={metric} ceiling={ceiling} />
        </div>
      ))}
    </div>
  );
}
