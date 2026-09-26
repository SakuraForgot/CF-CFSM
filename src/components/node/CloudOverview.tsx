import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { formatBytes } from "@/utils/format";
import { OverviewTrafficChart } from "./OverviewTrafficChart";

export interface CloudOverviewData {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
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

export function CloudOverview({
  overview: o,
  nodes,
}: {
  overview: CloudOverviewData;
  nodes: { uuid: string; name: string; online: boolean | null | undefined }[];
}) {
  const unknown = o.totalNodes - o.onlineNodes - o.offlineNodes;
  const attention = o.offlineNodes > 0 || unknown > 0 || !o.totalNodes;
  const StatusIcon = attention ? CircleAlert : CircleCheck;
  const orderedNodes = [...nodes].sort((a, b) =>
    Number(a.online === true) - Number(b.online === true),
  );
  const status = !o.totalNodes
    ? "等待服务器接入"
    : o.offlineNodes
      ? `${o.offlineNodes} 台服务器离线`
      : unknown
        ? `${unknown} 台状态待确认`
        : "所有服务器运行正常";
  const metrics = [
    {
      label: "在线服务器",
      value: String(o.onlineNodes),
      unit: `/ ${o.totalNodes}`,
      caption: `离线 ${o.offlineNodes} 台${unknown ? ` · 待确认 ${unknown} 台` : ""}`,
      icon: Server,
      percent: o.totalNodes ? (o.onlineNodes / o.totalNodes) * 100 : 0,
      tone: "green",
    },
    {
      label: "平均 CPU 使用率",
      value: o.onlineNodes ? o.avgCpu.toFixed(1) : "—",
      unit: "%",
      caption: "在线服务器平均负载",
      icon: Cpu,
      percent: o.avgCpu,
      tone: "orange",
    },
    {
      label: "内存使用量",
      value: o.onlineNodes ? formatBytes(o.totalRamUsed) : "—",
      unit: "",
      caption: `总容量 ${formatBytes(o.totalRamTotal)}`,
      icon: MemoryStick,
      percent: o.ramPct,
      tone: "blue",
    },
    {
      label: "磁盘使用量",
      value: o.onlineNodes ? formatBytes(o.totalDiskUsed) : "—",
      unit: "",
      caption: `总容量 ${formatBytes(o.totalDiskTotal)}`,
      icon: HardDrive,
      percent: o.diskPct,
      tone: "purple",
    },
  ];
  return (
    <section className="cf-overview" aria-label="监控总览">
      <div className="cf-metrics">
        {metrics.map(
          ({ label, value, unit, caption, icon: Icon, percent, tone }) => (
            <article className="cf-metric" key={label}>
              <div className="cf-metric-label">
                {label}
                <Icon size={16} />
              </div>
              <div className="cf-metric-value">
                {value}
                <span>{unit}</span>
              </div>
              <div className={`cf-meter ${tone}`}>
                <i
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>
              <p>{caption}</p>
            </article>
          ),
        )}
      </div>
      <div className="cf-insights">
        <section className="cf-panel cf-traffic-panel">
          <div className="cf-panel-heading">
            <h2>
              <Activity size={16} />
              网络吞吐
            </h2>
            <span>当前会话采样</span>
          </div>
          <OverviewTrafficChart netUp={o.netUp} netDown={o.netDown} />
          <div className="cf-panel-caption">
            从打开页面开始记录 · 当前会话采样
          </div>
        </section>
        <section className="cf-panel cf-health-panel">
          <div className="cf-panel-heading">
            <h2>集群状态</h2>
            <Link className="cf-cluster-all" to="/?section=servers">查看全部 <ArrowUpRight size={13} /></Link>
          </div>
          <div
            className={`cf-cluster-notice ${attention ? "is-warning" : ""}`}
          >
            <StatusIcon size={16} aria-hidden />
            {status}
          </div>
          <dl className="cf-cluster-counts">
            <div><dt><i className="is-online" />在线</dt><dd>{o.onlineNodes}</dd></div>
            <div><dt><i className="is-offline" />离线</dt><dd>{o.offlineNodes}</dd></div>
            <div><dt><i className="is-unknown" />待确认</dt><dd>{unknown}</dd></div>
          </dl>
          <div className="cf-cluster-nodes" aria-label="节点运行状态">
            {orderedNodes.map((node) => (
              <Link key={node.uuid} to={`/server/${encodeURIComponent(node.uuid)}`} className="cf-cluster-node">
                <Server size={14} aria-hidden />
                <span className="cf-cluster-node-name" title={node.name}>{node.name}</span>
                <span className="cf-cluster-node-status" data-state={node.online === true ? "online" : node.online === false ? "offline" : "unknown"}>
                  <i />{node.online === true ? "在线" : node.online === false ? "离线" : "待确认"}
                </span>
              </Link>
            ))}
          </div>
          <div className="cf-cluster-connections">
            <div className="cf-cluster-connections-title"><span>活跃连接</span><strong>{o.onlineNodes ? (o.totalTcpConn + o.totalUdpConn).toLocaleString() : "—"}</strong></div>
            <dl>
              <div><dt>TCP</dt><dd>{o.onlineNodes ? o.totalTcpConn.toLocaleString() : "—"}</dd></div>
              <div><dt>UDP</dt><dd>{o.onlineNodes ? o.totalUdpConn.toLocaleString() : "—"}</dd></div>
            </dl>
          </div>
        </section>
      </div>
    </section>
  );
}
