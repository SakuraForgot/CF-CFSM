import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Server, X } from "lucide-react";
import { Button } from "@cloudflare/kumo/components/button";
import { ConsoleTabs } from "@/components/ui/ConsoleTabs";
import { SelectionPanel } from "@/components/ui/SelectionPanel";
import { CloudOverview } from "./CloudOverview";
import { Flag } from "@/components/ui/Flag";
import { DraggableCostBall } from "@/components/node/DraggableCostBall";
import { useAuth } from "@/hooks/useAuth";
import {
  useAllNodeMeta,
  useHomeNodeSummaries,
  useNodeStoreStatus,
} from "@/hooks/useNode";
import { useHomepagePingOverview } from "@/hooks/usePingOverview";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useViewMode } from "@/hooks/useViewMode";
import { calculateCostSummary, getExchangeRates } from "@/utils/cost";
import { getOverviewRating } from "@/utils/overviewRating";
import { useHiddenNodeUuids } from "@/hooks/useVisibleNodes";
import {
  getHomeGroupLabel,
  getHomeGroupOptions,
  getHomeRegionOptions,
  HOME_ALL_GROUP,
  HOME_ALL_REGION,
  sortHomeGroupOptions,
  type HomeRegionOption,
} from "@/utils/homeNodes";
import { getDisplayRegionCode } from "@/utils/geo";
import { useHomeSort } from "@/hooks/useHomeSort";
import { useHomeNodeOrder } from "@/hooks/useHomeNodeOrder";
import { useHourlyClock } from "@/hooks/useClock";
import { preloadAssetsPage } from "@/services/assetsPageLoader";
import { HomeSortControl } from "./HomeSortControl";
import { CompactNodeCard } from "./CompactNodeCard";
import { MiniNodeCard } from "./MiniNodeCard";
import { NodeCard } from "./NodeCard";
import { NodeListView } from "./NodeListView";
import type { NodeViewMode } from "@/utils/themeSettings";

// 卡片视图网格密度；列表档由独立组件布局。
const GRID_LAYOUT: Record<
  NodeViewMode,
  { className: string; minColumnWidth: number }
> = {
  large: { className: "grid gap-4 xl:gap-5", minColumnWidth: 360 },
  compact: { className: "grid gap-3 xl:gap-4", minColumnWidth: 340 },
  mini: { className: "grid gap-3 xl:gap-3.5", minColumnWidth: 260 },
  // 占位以满足 Record 穷尽。
  list: { className: "", minColumnWidth: 0 },
};

type MiniGridStyle = CSSProperties & { "--mini-card-min-width": string };

// 标准 UUID 不含逗号，可安全拼成稳定签名。
const UUID_KEY_SEPARATOR = ",";

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface HomeOverview {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  trafficUp: number;
  trafficDown: number;
  netUp: number;
  netDown: number;
  avgCpu: number;
  totalRamUsed: number;
  totalRamTotal: number;
  ramPct: number;
  totalDiskUsed: number;
  totalDiskTotal: number;
  diskPct: number;
  totalTcpConn: number;
  totalUdpConn: number;
}

function GroupTabs({
  groups,
  selectedGroup,
  onSelectGroup,
}: {
  groups: string[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
}) {
  return (
    <ConsoleTabs
      label="服务器分组"
      className="cf-group-tabs"
      value={selectedGroup}
      onValueChange={onSelectGroup}
      items={[{ value: HOME_ALL_GROUP, label: "全部" }, ...groups.map((group) => ({ value: group, label: group }))]}
    />
  );
}

// 地区筛选栏:按国旗聚合节点,点击某地区只看该地区;再点一次(或点已选中项)回到全部。
// 与分组栏是两条独立筛选,可叠加(先分组、后地区)。
function RegionTabs({
  regions,
  selectedRegion,
  onSelectRegion,
}: {
  regions: HomeRegionOption[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}) {
  return (
    <section className="home-region-bar" aria-label="地区筛选">
      <div className="home-region-chips" role="group">
        {regions.map(({ code, count }) => {
          const active = selectedRegion === code;
          return (
            <button
              key={code}
              type="button"
              className="home-region-chip"
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => onSelectRegion(active ? HOME_ALL_REGION : code)}
              title={code}
            >
              <Flag region={code} size={14} />
              <span className="home-region-chip-code">{code}</span>
              <span className="home-region-chip-count">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function NodeGrid() {
  const now = useHourlyClock();
  const nodes = useHomeNodeSummaries();
  const allMeta = useAllNodeMeta();
  const { hydrated: storeHydrated, nodeInfoError } = useNodeStoreStatus();
  const { data: me } = useAuth();
  const themeSettings = useThemeSettings();
  const { mode, setMode, device } = useViewMode();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const sort = useHomeSort();
  // enableHomeSort 控制访客能否改排序;关闭时无视 session 覆盖、直接用管理员默认序(默认仍是 weight)。
  const sortEnabled = themeSettings.isReady && themeSettings.enableHomeSort;
  const sortField = sortEnabled ? sort.field : themeSettings.homeSortField;
  const sortDirection = sortEnabled
    ? sort.direction
    : themeSettings.homeSortDirection;
  const [selectedGroup, setSelectedGroup] = useState(HOME_ALL_GROUP);
  const [selectedRegion, setSelectedRegion] = useState(HOME_ALL_REGION);
  useHomepagePingOverview(mode);

  // 摘要不含名称，先从完整 meta 解析主题隐藏列表，再统一过滤各类数据。
  const hiddenUuids = useHiddenNodeUuids();
  const visibleNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          (me?.logged_in === true || !node.hidden) &&
          !hiddenUuids.has(node.uuid),
      ),
    [me?.logged_in, nodes, hiddenUuids],
  );
  // 资产统计与卡片使用同一可见性规则，避免泄露隐藏节点信息。
  const visibleMeta = useMemo(
    () =>
      allMeta.filter(
        (node) =>
          (me?.logged_in === true || !node.hidden) &&
          !hiddenUuids.has(node.uuid),
      ),
    [allMeta, me?.logged_in, hiddenUuids],
  );
  // 「名称」排序需要展示名(摘要无 name),从 meta 注入。
  const nameByUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of visibleMeta)
      map.set(node.uuid, node.name?.trim() || node.uuid);
    return map;
  }, [visibleMeta]);
  const overview = useMemo<HomeOverview>(() => {
    let onlineNodes = 0;
    let offlineNodes = 0;
    let trafficUp = 0;
    let trafficDown = 0;
    let netUp = 0;
    let netDown = 0;
    let totalCpu = 0;
    let totalRamUsed = 0;
    let totalRamTotal = 0;
    let totalDiskUsed = 0;
    let totalDiskTotal = 0;
    let totalTcpConn = 0;
    let totalUdpConn = 0;

    for (const node of visibleNodes) {
      if (node.online === true) {
        onlineNodes += 1;
        totalCpu += node.cpuPct || 0;
        totalRamUsed += node.ramUsed || 0;
        totalDiskUsed += node.diskUsed || 0;
        totalTcpConn += node.tcpConn || 0;
        totalUdpConn += node.udpConn || 0;
      } else if (node.online === false) {
        offlineNodes += 1;
      }
      totalRamTotal += node.ramTotal || 0;
      totalDiskTotal += node.diskTotal || 0;
      trafficUp += node.trafficUp;
      trafficDown += node.trafficDown;
      netUp += node.netUp;
      netDown += node.netDown;
    }

    const avgCpu = onlineNodes > 0 ? totalCpu / onlineNodes : 0;
    const ramPct = totalRamTotal > 0 ? (totalRamUsed / totalRamTotal) * 100 : 0;
    const diskPct =
      totalDiskTotal > 0 ? (totalDiskUsed / totalDiskTotal) * 100 : 0;

    return {
      totalNodes: visibleNodes.length,
      onlineNodes,
      offlineNodes,
      trafficUp,
      trafficDown,
      netUp,
      netDown,
      avgCpu,
      totalRamUsed,
      totalRamTotal,
      ramPct,
      totalDiskUsed,
      totalDiskTotal,
      diskPct,
      totalTcpConn,
      totalUdpConn,
    };
  }, [visibleNodes]);
  const showHomeOverview =
    themeSettings.isReady && themeSettings.showHomeOverview;
  const hasNodes = visibleMeta.length > 0;
  const loggedIn = Boolean(me?.logged_in);
  const canAccessAssets = loggedIn || themeSettings.showPriceForGuests;
  // 资产总值卡片默认保持开启（展示与访客保密统一由 showPriceForGuests 控制）
  const showAssetCard = showHomeOverview && hasNodes && canAccessAssets;
  const showCostDetailButton =
    showAssetCard &&
    themeSettings.isReady &&
    themeSettings.showCostSummary &&
    canAccessAssets;
  const showCostFloatingButton =
    themeSettings.isReady &&
    themeSettings.showCostSummaryFloatingButton &&
    hasNodes &&
    canAccessAssets &&
    !showCostDetailButton;

  useEffect(() => {
    if (!showCostDetailButton && !showCostFloatingButton) return;

    const idleWindow = window as IdleCapableWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preloadAssetsPage, {
        timeout: 2_000,
      });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    // Safari 等无 requestIdleCallback 的浏览器，在首页稳定后再低优先级预取。
    const handle = window.setTimeout(preloadAssetsPage, 1_000);
    return () => window.clearTimeout(handle);
  }, [showCostDetailButton, showCostFloatingButton]);

  // 资产入口存在时预热汇率，供概览、价格排序和资产页复用。
  const costNeeded = showAssetCard || showCostFloatingButton;
  const rateQuery = useQuery({
    queryKey: ["cost-rates", themeSettings.costRateApiUrl],
    queryFn: ({ signal }) =>
      getExchangeRates(themeSettings.costRateApiUrl, { signal }),
    staleTime: 60 * 60 * 1000,
    // 「价格」排序也要汇率换算月化价,即便没显示资产卡也得拉一次;但空列表无需拉。
    enabled: (costNeeded || sortField === "price") && hasNodes,
    retry: 1,
  });
  const costSummary = useMemo(
    () =>
      rateQuery.data
        ? calculateCostSummary(
            visibleMeta,
            themeSettings.costIgnoredNodes,
            rateQuery.data.rates,
            themeSettings.costPremiums,
            now,
          )
        : null,
    [
      now,
      visibleMeta,
      themeSettings.costIgnoredNodes,
      themeSettings.costPremiums,
      rateQuery.data,
    ],
  );
  // 「价格」排序键:月化价格(CNY);免费/忽略/汇率缺失的节点 null,排到默认序之后。
  const priceByUuid = useMemo(() => {
    const map = new Map<string, number | null>();
    if (costSummary) {
      for (const detail of costSummary.details) {
        map.set(detail.uuid, detail.counted ? detail.monthlyCny : null);
      }
    }
    return map;
  }, [costSummary]);
  const groupOptions = useMemo(
    () =>
      sortHomeGroupOptions(
        getHomeGroupOptions(visibleNodes),
        themeSettings.isReady ? themeSettings.homeGroupOrder : [],
      ),
    [visibleNodes, themeSettings.homeGroupOrder, themeSettings.isReady],
  );
  const groupFilteredNodes = useMemo(
    () =>
      selectedGroup === HOME_ALL_GROUP
        ? visibleNodes
        : visibleNodes.filter(
            (node) => getHomeGroupLabel(node.group) === selectedGroup,
          ),
    [visibleNodes, selectedGroup],
  );
  // 地区选项在分组筛选之后统计,让国旗计数反映当前分组内的分布。
  const regionOptions = useMemo(
    () => getHomeRegionOptions(groupFilteredNodes),
    [groupFilteredNodes],
  );
  const regionFilteredNodes = useMemo(
    () =>
      selectedRegion === HOME_ALL_REGION
        ? groupFilteredNodes
        : groupFilteredNodes.filter(
            (node) => getDisplayRegionCode(node.region) === selectedRegion,
          ),
    [groupFilteredNodes, selectedRegion],
  );
  const filteredNodes = useMemo(
    () =>
      regionFilteredNodes.filter((node) => {
        const name = nameByUuid.get(node.uuid) ?? node.uuid;
        const matchesText = [name, node.uuid, node.region, node.group]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "online"
            ? node.online === true
            : statusFilter === "offline"
              ? node.online === false
              : node.online == null);
        return matchesText && matchesStatus;
      }),
    [regionFilteredNodes, nameByUuid, search, statusFilter],
  );
  // 排序在分组筛选之后。离线永远沉底(写死,见 homeSort);实时网速走防抖(键平滑+滞回+5s 重排)。
  const orderedNodes = useHomeNodeOrder({
    nodes: filteredNodes,
    field: sortField,
    direction: sortDirection,
    nameByUuid,
    priceByUuid,
  });

  useEffect(() => {
    if (
      selectedGroup !== HOME_ALL_GROUP &&
      !groupOptions.includes(selectedGroup)
    ) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [groupOptions, selectedGroup]);

  // 选中的地区在当前分组里不存在了(切换分组/节点变化)就回到全部。
  useEffect(() => {
    if (
      selectedRegion !== HOME_ALL_REGION &&
      !regionOptions.some((option) => option.code === selectedRegion)
    ) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [regionOptions, selectedRegion]);

  // 地区栏被配置关闭(热更新)时,清掉可能残留的地区筛选,否则会留下一个不可见的过滤条件。
  useEffect(() => {
    if (!themeSettings.showRegionBar && selectedRegion !== HOME_ALL_REGION) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [themeSettings.showRegionBar, selectedRegion]);

  useEffect(() => {
    if (!themeSettings.showGroupTabs && selectedGroup !== HOME_ALL_GROUP) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [themeSettings.showGroupTabs, selectedGroup]);

  // 卡片列表只随 UUID 集合/顺序变化；卡片内部各自订阅实时数据。
  const uuidsKey = useMemo(
    () => orderedNodes.map((node) => node.uuid).join(UUID_KEY_SEPARATOR),
    [orderedNodes],
  );
  const orderedUuids = useMemo(
    () => (uuidsKey ? uuidsKey.split(UUID_KEY_SEPARATOR) : []),
    [uuidsKey],
  );
  // 列表档由下方 NodeListView 渲染,这里不必构造卡片元素。
  const cards = useMemo(
    () =>
      mode === "list"
        ? null
        : orderedUuids.map((uuid) => (
            <div key={uuid} className="min-w-0">
              {mode === "mini" ? (
                <MiniNodeCard uuid={uuid} />
              ) : mode === "compact" ? (
                <CompactNodeCard uuid={uuid} />
              ) : (
                <NodeCard uuid={uuid} />
              )}
            </div>
          )),
    [orderedUuids, mode],
  );
  const showGroupTabs =
    themeSettings.isReady &&
    themeSettings.showGroupTabs &&
    groupOptions.length > 0;
  const showHomeSort = sortEnabled && visibleNodes.length > 1;
  // 地区栏:只有一个地区时筛选无意义,>1 才显示。
  const showRegionBar =
    themeSettings.isReady &&
    themeSettings.showRegionBar &&
    regionOptions.length > 1;
  // 分组标签栏与卡片网格共用列定义，让标签栏左缘对齐首卡。
  const isMini = mode === "mini";
  const isList = mode === "list";
  const { className: gridClassName, minColumnWidth } = GRID_LAYOUT[mode];
  const gridWrapClassName = isMini
    ? `${gridClassName} node-grid-mini`
    : gridClassName;
  const gridStyle = isList
    ? undefined
    : isMini
      ? ({ "--mini-card-min-width": `${minColumnWidth}px` } as MiniGridStyle)
      : {
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
        };
  const gridElement = (
    <div className={gridWrapClassName} style={gridStyle}>
      {cards}
    </div>
  );
  // 迷你与列表档的控件栏借用小卡列宽，避免跟随密集内容列而被压窄。
  const borrowControlsGrid = isMini || isList;
  const controlsWrapClassName = borrowControlsGrid
    ? "grid gap-3 home-controls-bar mb-4"
    : `${gridWrapClassName} home-controls-bar mb-4`;
  const controlsStyle = borrowControlsGrid
    ? {
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${GRID_LAYOUT.compact.minColumnWidth}px), 1fr))`,
      }
    : gridStyle;

  if (!themeSettings.isReady || !storeHydrated) {
    if (!nodeInfoError) return null;
    return (
      <div
        className="flex h-[40vh] flex-col items-center justify-center gap-2 text-(--text-tertiary)"
        aria-live="polite"
      >
        <span className="text-[14px]">节点数据暂时无法加载</span>
        <span className="text-[12px]">正在等待后端自动重试</span>
      </div>
    );
  }

  // 资产页悬浮入口 + 首页概览卡在「空节点」与正常两个分支里完全一致，提取一次复用。
  const homeHeader = (
    <>
      {showCostFloatingButton && <DraggableCostBall />}
      {showHomeOverview && <CloudOverview overview={overview} nodes={visibleNodes.map((node) => ({
        uuid: node.uuid, name: nameByUuid.get(node.uuid) ?? node.uuid, online: node.online,
      }))} />}
    </>
  );

  if (visibleNodes.length === 0) {
    return (
      <>
        {homeHeader}
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-(--text-tertiary)">
          <span className="text-[15px]">尚未连接到任何节点</span>
          <span className="text-[12px]">等待后端推送或前往管理后台添加</span>
        </div>
      </>
    );
  }

  return (
    <>
      {homeHeader}
      <section
        id="servers"
        className="mao-cluster-card"
        aria-label="服务器集群与监控列表"
      >
        <div className="cf-server-heading">
          <div>
            <h2>
              <Server size={17} />
              服务器 <span className="cf-count">{visibleNodes.length}</span>
            </h2>
            <p>查看资源使用情况、网络质量与运行状态。</p>
          </div>
          <ConsoleTabs
            label="服务器视图"
            value={mode}
            onValueChange={(value) => setMode(value as NodeViewMode)}
            items={[
              ...(device === "desktop" ? [{ value: "list", label: "列表" }] : []),
              { value: "compact", label: "卡片" },
              { value: "mini", label: "紧凑" },
              { value: "large", label: "详细" },
            ]}
          />
        </div>
        <div className="cf-filter-bar">
          <label className="cf-search">
            <Search size={16} />
            <input
              aria-label="搜索服务器"
              placeholder="搜索名称、地区、分组…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="清空搜索" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </label>
          <select
            aria-label="服务器状态"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">所有状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="unknown">待确认</option>
          </select>
          {showHomeSort && <HomeSortControl state={sort} />}
        </div>
        {showGroupTabs && (
          <div className={controlsWrapClassName} style={controlsStyle}>
            {showGroupTabs && (
              <GroupTabs
                groups={groupOptions}
                selectedGroup={selectedGroup}
                onSelectGroup={setSelectedGroup}
              />
            )}
          </div>
        )}
        {showRegionBar && (
          <RegionTabs
            regions={regionOptions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        )}
        <SelectionPanel selectionKey={`${mode}:${selectedGroup}:${selectedRegion}`} className="cf-server-results">
        {orderedUuids.length === 0 ? (
          <div className="cf-empty">
            <Search size={26} />
            <strong>没有匹配的服务器</strong>
            <p>试试其他关键词，或调整分组、地区与状态筛选。</p>
            <Button
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSelectedGroup(HOME_ALL_GROUP);
                setSelectedRegion(HOME_ALL_REGION);
              }}
            >
              重置筛选
            </Button>
          </div>
        ) : isList ? (
          <NodeListView uuids={orderedUuids} />
        ) : (
          gridElement
        )}
        </SelectionPanel>
        <div className="cf-table-footer">
          <span>
            显示 {orderedUuids.length} / {visibleNodes.length} 台服务器
          </span>
          {showCostDetailButton && (
            <Link to="/assets">
              {themeSettings.showOverviewRatings &&
              themeSettings.showAssetRating &&
              costSummary
                ? `${getOverviewRating({ kind: "asset", value: costSummary.remainingCny, customLabels: themeSettings.assetRatingLabels }).label} · `
                : ""}
              查看资产概览 →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
