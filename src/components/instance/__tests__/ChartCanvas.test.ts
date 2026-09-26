// @vitest-environment jsdom
import { act, createElement, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type uPlot from "uplot";
import { ChartCanvas } from "../ChartCanvas";

const calls = vi.hoisted(() => ({ create: vi.fn(), destroy: vi.fn(), data: vi.fn(), size: vi.fn() }));
vi.mock("uplot", () => ({ default: class {
  canvas = document.createElement("canvas");
  constructor(options: uPlot.Options, data: uPlot.AlignedData, host: HTMLElement) {
    host.append(this.canvas); calls.create(options, data);
  }
  destroy() { this.canvas.remove(); calls.destroy(); }
  setData = calls.data;
  setSize = calls.size;
} }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
it("updates data and size in place; option changes finish before the parent layout phase", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"), root = createRoot(host);
  const frames: number[] = [];
  const options: uPlot.Options = { width: 400, height: 200, series: [{}, {}] };
  const first: uPlot.AlignedData = [[1, 2], [3, 4]];
  function Probe({ options, data }: { options: uPlot.Options; data: uPlot.AlignedData }) {
    useLayoutEffect(() => { frames.push(host.querySelectorAll("canvas").length); });
    return createElement(ChartCanvas, { options, data });
  }
  const render = (options: uPlot.Options, data: uPlot.AlignedData) =>
    act(() => root.render(createElement(Probe, { options, data })));
  render(options, first);
  const canvas = host.querySelector("canvas");
  const next: uPlot.AlignedData = [[3, 4], [5, 6]];
  render(options, next);
  render({ ...options, width: 600 }, next);
  expect(host.querySelector("canvas")).toBe(canvas);
  expect(calls.create).toHaveBeenCalledTimes(1);
  expect(calls.data).toHaveBeenCalledWith(next, true);
  expect(calls.size).toHaveBeenCalledWith({ width: 600, height: 200 });
  render({ ...options, series: [{}, { stroke: "blue" }] }, next);
  expect(calls.create).toHaveBeenCalledTimes(2);
  expect(frames).toEqual([1, 1, 1, 1]);
  act(() => root.unmount());
  expect(calls.destroy).toHaveBeenCalledTimes(2);
});
