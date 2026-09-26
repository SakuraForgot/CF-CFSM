// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreferences } from "../usePreferences";
import { resetViewModeOverrides, useViewMode } from "../useViewMode";
import { resetLocalThemeSettings, saveLocalThemeSettings } from "@/services/themeSettingsStore";

vi.mock("@/hooks/usePublicConfig", () => ({
  usePublicConfig: () => ({ data: { theme_settings: { defaultAppearance: "light", desktopNodeViewMode: "list", mobileNodeViewMode: "compact" } }, isLoading: false, isError: false }),
}));

const media = new Map<string, EventTarget & { matches: boolean }>();
let root: Root;
let prefs: ReturnType<typeof usePreferences>;
let view: ReturnType<typeof useViewMode>;
function Probe() {
  prefs = usePreferences();
  view = useViewMode();
  return createElement("output", null, `${prefs.resolvedAppearance}:${view.mode}`);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", (query: string) => {
    if (!media.has(query)) media.set(query, Object.assign(new EventTarget(), { matches: false }));
    return media.get(query);
  });
  for (const query of media.values()) query.matches = false;
  localStorage.clear();
  sessionStorage.clear();
  resetLocalThemeSettings();
  resetViewModeOverrides();
  root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  act(() => prefs.resetAppearance("light"));
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

describe("settings replace previous display overrides", () => {
  it("applies a new default despite a prior navbar choice, including system changes", () => {
    act(() => prefs.setAppearance("light"));
    act(() => {
      saveLocalThemeSettings({ defaultAppearance: "dark" });
      prefs.resetAppearance("dark");
    });
    expect(document.documentElement.dataset.appearance).toBe("dark");
    expect(localStorage.getItem("appearance")).toBeNull();
    expect(JSON.parse(localStorage.getItem("appearance_default")!)).toBe("dark");
    act(() => {
      saveLocalThemeSettings({ defaultAppearance: "system" });
      prefs.resetAppearance("system");
    });
    expect(prefs.resolvedAppearance).toBe("light");
    const system = media.get("(prefers-color-scheme: dark)")!;
    act(() => { system.matches = true; system.dispatchEvent(new Event("change")); });
    expect(prefs.resolvedAppearance).toBe("dark");
    expect(document.documentElement.dataset.mode).toBe("dark");
  });

  it("replaces only the chosen device's view override and survives remount", () => {
    act(() => view.setMode("mini"));
    sessionStorage.setItem("komaritheme:node-view-mode-session:mobile", "large");
    act(() => {
      saveLocalThemeSettings({ desktopNodeViewMode: "compact" });
      resetViewModeOverrides("desktop");
    });
    expect(view.mode).toBe("compact");
    expect(sessionStorage.getItem("komaritheme:node-view-mode-session:desktop")).toBeNull();
    expect(sessionStorage.getItem("komaritheme:node-view-mode-session:mobile")).toBe("large");
    act(() => root.render(null));
    act(() => root.render(createElement(Probe)));
    expect(view.mode).toBe("compact");
    const mobile = media.get("(max-width: 720px)")!;
    act(() => { mobile.matches = true; mobile.dispatchEvent(new Event("change")); });
    expect(view.mode).toBe("large");
    act(() => {
      saveLocalThemeSettings({ desktopNodeViewMode: "compact", mobileNodeViewMode: "mini" });
      resetViewModeOverrides("mobile");
    });
    expect(view.mode).toBe("mini");
  });

  it("restores backend appearance and both views after personal overrides", () => {
    act(() => { prefs.setAppearance("dark"); view.setMode("large"); });
    sessionStorage.setItem("komaritheme:node-view-mode-session:mobile", "mini");
    act(() => {
      resetLocalThemeSettings();
      prefs.resetAppearance("light");
      resetViewModeOverrides();
    });
    expect(document.documentElement.dataset.appearance).toBe("light");
    expect(view.mode).toBe("list");
    expect(sessionStorage.getItem("komaritheme:node-view-mode-session:mobile")).toBeNull();
  });
});
