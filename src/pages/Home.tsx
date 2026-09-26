import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, LinkButton } from "@cloudflare/kumo/components/button";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { NodeGrid } from "@/components/node/NodeGrid";
import { Spinner } from "@/components/ui/Spinner";
import { useNodeStoreStatus } from "@/hooks/useNode";
import { usePingHistoryRefresh } from "@/hooks/usePingHistoryRefresh";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { getAdminUrl } from "@/services/cfsm/config";

const ThemeManage = lazy(() =>
  import("@/pages/ThemeManage").then((module) => ({
    default: module.ThemeManage,
  })),
);

function HomeDashboard() {
  const [params] = useSearchParams();
  const settings = useThemeSettings();
  const status = useNodeStoreStatus();
  const ping = usePingHistoryRefresh();
  const demo =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("mock") === "1";
  useEffect(() => {
    if (
      params.get("section") === "servers" &&
      status.hydrated &&
      settings.isReady
    )
      document
        .getElementById("servers")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [params, status.hydrated, settings.isReady]);
  const connection = status.realtimeSessionExpired
    ? "实时会话已暂停"
    : status.failureStreak > 0
      ? "同步异常 · 显示上次数据"
      : status.partial
        ? "部分站点未连接"
        : status.realtimeConnected
          ? "实时连接"
          : "轮询更新";
  const refreshMessage =
    ping.status === "warn"
      ? "最近 30 分钟内已刷新过延迟数据，再次点击将重新拉取。"
      : ping.status === "error"
        ? "延迟刷新失败，请重试。"
        : ping.status === "done"
          ? `延迟数据已更新：${ping.lastResult?.succeeded ?? 0} 台成功，${ping.lastResult?.failed ?? 0} 台失败。`
          : "";
  return (
    <div className="home-dashboard cf-dashboard">
      <div className="cf-page-heading">
        <div>
          <div className="cf-eyebrow">概览</div>
          <h1>基础设施概览</h1>
          <p>让每一台服务器的运行状况，一目了然。</p>
        </div>
        <div className="cf-page-actions">
          <Button
            onClick={() => ping.refresh()}
            disabled={ping.status === "loading" || ping.nodeCount === 0}
          >
            <RefreshCw
              size={14}
              className={ping.status === "loading" ? "animate-spin" : ""}
            />
            {ping.status === "loading" ? "刷新中…" : "刷新延迟"}
          </Button>
          {settings.enableAdminButton && (
            <LinkButton variant="primary" className="cf-primary-link" href={getAdminUrl()}>
              管理服务器
              <ArrowUpRight size={14} />
            </LinkButton>
          )}
        </div>
      </div>
      <div className="cf-context-line">
        <span
          className={`cf-connection ${status.failureStreak || status.partial || status.realtimeSessionExpired ? "is-warning" : ""}`}
        >
          <i />
          {connection}
        </span>
        <span>
          {demo
            ? "演示环境 · 所有数值均为模拟数据"
            : "显示当前可见服务器的监控数据"}
        </span>
      </div>
      {refreshMessage && (
        <div className="cf-notice" role="status">
          {refreshMessage}
        </div>
      )}
      <NodeGrid />
    </div>
  );
}

export function Home() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("view") === "theme-manage")
    return (
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Spinner size={24} />
          </div>
        }
      >
        <ThemeManage />
      </Suspense>
    );
  return <HomeDashboard />;
}
