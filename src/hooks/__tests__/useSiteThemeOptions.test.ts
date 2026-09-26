// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildSiteThemeOptions } from "@/hooks/useSiteThemeOptions";
import { EMPTY_PING_LINE_OVERRIDES_BY_NODE } from "@/utils/pingLineOverrides";

const base = {
  siteSettings: undefined,
  preferredAppearance: undefined,
  localSettings: {},
  localLineOverrides: EMPTY_PING_LINE_OVERRIDES_BY_NODE,
};

describe("buildSiteThemeOptions", () => {
  it("keeps the backend's default appearance when no theme setting names one", () => {
    // 取色器的「保存到后端」曾把「跟随系统」写进站点配置，后台设的深色对所有访客失效。
    expect(buildSiteThemeOptions({ ...base, preferredAppearance: "dark" }).defaultAppearance).toBe(
      "dark",
    );
    expect(
      buildSiteThemeOptions({
        ...base,
        preferredAppearance: "dark",
        localSettings: { defaultAppearance: "light" },
      }).defaultAppearance,
    ).toBe("light");
  });

  it("carries the line switches made on cards", () => {
    const snapshot = buildSiteThemeOptions({
      ...base,
      localLineOverrides: { "node-a": { "0": 5 } },
    });

    expect(snapshot.homepagePingLineOverrides).toEqual({ "node-a": { "0": 5 } });
  });

  it("layers active settings without publishing retired palette overrides", () => {
    const snapshot = buildSiteThemeOptions({
      ...base,
      siteSettings: { desktopNodeViewMode: "list", metricColors: { cpu: "#111111", disk: "#222222" } },
      localSettings: { desktopNodeViewMode: "compact", metricColors: { cpu: "#333333" } },
      draftSettings: { desktopNodeViewMode: "large" },
    });

    expect(snapshot.desktopNodeViewMode).toBe("large");
    expect(snapshot).not.toHaveProperty("metricColors");
  });

  it("keeps functional settings while dropping retired SAO options from a saved snapshot", () => {
    const snapshot = buildSiteThemeOptions({
      ...base,
      siteSettings: {
        enableBackgroundImage: true, backgroundMediaType: "video", backgroundVideo: "https://example.com/old.mp4",
        surfaceOpacity: 10, darkDepth: 100, showOverviewRatings: true, showAssetRating: true,
        showCostSummaryFloatingButton: true, showCostSummary: false,
        costPremiums: { "node-a": { amount: 25 } }, hiddenNodes: ["node-b"], showConnections: true,
      },
    });
    for (const key of ["enableBackgroundImage", "backgroundMediaType", "backgroundVideo", "surfaceOpacity",
      "darkDepth", "showOverviewRatings", "showAssetRating", "showCostSummaryFloatingButton"]) {
      expect(snapshot).not.toHaveProperty(key);
    }
    expect(snapshot.showCostSummary).toBe(false);
    expect(snapshot.costPremiums).toEqual({ "node-a": { amount: 25 } });
    expect(snapshot.hiddenNodes).toEqual(["node-b"]);
    expect(snapshot.showConnections).toBe(true);
  });
});
