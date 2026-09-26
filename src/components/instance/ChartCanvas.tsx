import { useLayoutEffect, useRef } from "react";
import uPlot from "uplot";

/** Commit the canvas and its options together before paint, without an empty frame. */
export function ChartCanvas({ options, data, resetScales = true }: {
  options: uPlot.Options;
  data: uPlot.AlignedData;
  resetScales?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef<{ plot: uPlot; options: uPlot.Options; data: uPlot.AlignedData } | null>(null);
  useLayoutEffect(() => {
    if (!host.current) return;
    const previous = current.current;
    const changed = !previous || Object.keys({ ...previous.options, ...options }).some(
      (key) => key !== "width" && key !== "height" &&
        previous.options[key as keyof uPlot.Options] !== options[key as keyof uPlot.Options],
    );
    if (changed) {
      previous?.plot.destroy();
      current.current = { plot: new uPlot(options, data, host.current), options, data };
    } else {
      if (options.width !== previous.options.width || options.height !== previous.options.height) {
        previous.plot.setSize({ width: options.width, height: options.height });
      }
      if (data !== previous.data) previous.plot.setData(data, resetScales);
      current.current = { ...previous, options, data };
    }
  }, [data, options, resetScales]);
  useLayoutEffect(() => () => {
    current.current?.plot.destroy();
    current.current = null;
  }, []);
  return <div ref={host} className="instance-chart-canvas" />;
}
