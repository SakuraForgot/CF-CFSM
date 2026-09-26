// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionPanel } from "../SelectionPanel";

describe("selection motion", () => {
  let root: Root;
  let host: HTMLDivElement;
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    animate.mockClear(); cancel.mockClear();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    vi.unstubAllGlobals();
  });
  function render(key: string, value: string) {
    act(() => root.render(createElement(SelectionPanel, { selectionKey: key, children: value })));
  }
  it("animates selection changes, not initial mount or live metric rerenders", () => {
    render("all", "10"); render("all", "11");
    expect(animate).not.toHaveBeenCalled();
    render("production", "12");
    expect(animate).toHaveBeenCalledTimes(1);
    render("production", "13");
    expect(animate).toHaveBeenCalledTimes(1);
    render("backup", "14");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(2);
  });
  it("preserves child identity and suppresses motion when reduced motion is enabled", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const mounted = vi.fn();
    function Child() { useEffect(mounted, []); return null; }
    for (const key of ["load", "ping"]) {
      act(() => root.render(createElement(SelectionPanel, { selectionKey: key, children: createElement(Child) })));
    }
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });
});
