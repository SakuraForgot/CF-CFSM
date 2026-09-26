// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeManage } from "../ThemeManage";
import { getLocalThemeSettings, resetLocalThemeSettings, saveLocalThemeSettings } from "@/services/themeSettingsStore";

const config = vi.hoisted(() => ({ theme_settings: { defaultAppearance: "light", desktopNodeViewMode: "list", mobileNodeViewMode: "compact" } }));
vi.mock("@/hooks/usePublicConfig", () => ({
  usePublicConfig: () => ({ data: config, isLoading: false, isError: false }),
  useCarrierNames: () => undefined,
}));
vi.mock("@/services/api", () => ({ getNodes: async () => [] }));
vi.mock("@/hooks/useSiteThemeOptions", () => ({
  useCanSyncSiteTheme: () => false,
  useSiteThemeSyncStatus: () => ({ phase: "idle" }),
  useSiteThemeOptions: () => ({ snapshot: {} }),
  hasUnsyncedLocalChanges: () => false,
  cancelSiteThemeSync: vi.fn(),
}));
// Browser tests exercise Kumo itself; use native buttons to isolate settings wiring here.
vi.mock("@/components/ui/ConsoleTabs", () => ({ ConsoleTabs: ({ label, value, items, onValueChange }: {
  label: string; value: string; items: { value: string; label: import("react").ReactNode }[]; onValueChange: (value: string) => void;
}) => createElement("div", { "aria-label": label }, items.map(item => createElement("button", {
  key: item.value, "data-value": item.value, "aria-selected": value === item.value,
  onClick: () => onValueChange(item.value),
}, item.label))) }));

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear(); sessionStorage.clear(); resetLocalThemeSettings();
  host = document.createElement("div");
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});
afterEach(() => { act(() => root.unmount()); client.clear(); vi.unstubAllGlobals(); });
async function render() {
  await act(async () => root.render(createElement(QueryClientProvider, { client },
    createElement(MemoryRouter, { initialEntries: ["/?view=theme-manage&tab=appearance"] }, createElement(ThemeManage)))));
}
function choose(group: string, value: string) {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${group}"] [data-value="${value}"]`)!;
  act(() => button.click());
}

it("loads local settings on reopening and retains other choices while changing appearance", async () => {
  saveLocalThemeSettings({ desktopNodeViewMode: "large", mobileNodeViewMode: "mini", showHomeOverview: false, hiddenNodes: ["private-node"] });
  await render();
  expect(host.querySelector('[aria-label="移动端默认视图"] [data-value="mini"]')?.getAttribute("aria-selected")).toBe("true");
  choose("默认外观", "dark");
  expect(document.documentElement.dataset.appearance).toBe("dark");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
  expect(getLocalThemeSettings()).toMatchObject({ defaultAppearance: "dark", desktopNodeViewMode: "large", mobileNodeViewMode: "mini", showHomeOverview: false, hiddenNodes: ["private-node"] });
  act(() => root.render(null));
  await render();
  expect(host.querySelector('[aria-label="默认外观"] [data-value="dark"]')?.getAttribute("aria-selected")).toBe("true");
  expect(host.querySelector('[aria-label="桌面端默认视图"] [data-value="large"]')?.getAttribute("aria-selected")).toBe("true");
  choose("桌面端默认视图", "compact");
  expect(getLocalThemeSettings().desktopNodeViewMode).toBe("compact");
  expect(getLocalThemeSettings().mobileNodeViewMode).toBe("mini");
});

it("restores backend settings without writing a pending draft back afterwards", async () => {
  saveLocalThemeSettings({ defaultAppearance: "dark", desktopNodeViewMode: "large" });
  await render();
  choose("默认外观", "dark");
  const restore = [...host.querySelectorAll("button")].find(button => button.textContent === "改用后端配置")!;
  act(() => restore.click());
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
  expect(getLocalThemeSettings()).toEqual({});
  expect(document.documentElement.dataset.appearance).toBe("light");
  expect(host.querySelector('[aria-label="桌面端默认视图"] [data-value="list"]')?.getAttribute("aria-selected")).toBe("true");
});
