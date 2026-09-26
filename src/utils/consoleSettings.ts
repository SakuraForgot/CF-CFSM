/** Retired SAO presentation options are never republished by the CF console. */
const RETIRED_OPTIONS = new Set([
  "enableBackgroundImage", "backgroundMediaType", "backgroundImage", "backgroundImageMobile",
  "backgroundVideo", "backgroundVideoDark", "backgroundAlignment", "surfaceOpacity",
  "metricColors", "darkDepth", "showOverviewRatings", "showBandwidthRating", "showAssetRating",
  "bandwidthRatingLabels", "assetRatingLabels", "showCostSummaryFloatingButton", "showAssetOverview",
]);

export function omitRetiredThemeOptions(settings: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => !RETIRED_OPTIONS.has(key)));
}
