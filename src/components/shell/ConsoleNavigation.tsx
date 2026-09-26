import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@cloudflare/kumo/components/button";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Cloud,
  LayoutDashboard,
  Menu,
  Moon,
  Palette,
  Server,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/hooks/useAuth";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { getAdminUrl } from "@/services/cfsm/config";

export function ConsoleNavigation({ siteName }: { siteName: string }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { resolvedAppearance, setAppearance } = usePreferences();
  const { data: auth } = useAuth();
  const settings = useThemeSettings();
  const isSettings = location.search.includes("theme-manage");
  const isServer = location.pathname.startsWith("/server/");
  const isAssets = location.pathname === "/assets";
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <a
        className="cf-skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳转到主要内容
      </a>
      <header className="cf-topbar">
        <div className="cf-brand">
          <Button
            className="cf-mobile-menu"
            variant="ghost"
            shape="square"
            aria-label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open}
            aria-controls="console-sidebar"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </Button>
          <Link to="/" className="cf-brand-link" aria-label="CF Monitor 首页">
            <Cloud size={30} strokeWidth={2.5} />
            <span>
              CF<span className="cf-brand-light"> Monitor</span>
            </span>
          </Link>
        </div>
        <div className="cf-breadcrumb">
          <span title={siteName}>{siteName || "服务器监控"}</span>
          <ChevronRight size={14} />
          <strong>
            {isSettings
              ? "主题设置"
              : isAssets
                ? "资产概览"
                : isServer
                  ? "服务器详情"
                  : "概览"}
          </strong>
        </div>
        <div className="cf-top-actions">
          <a
            href="https://github.com/huilang-me/CF-Server-Monitor"
            target="_blank"
            rel="noreferrer"
            className="cf-doc-link"
          >
            文档 <ArrowUpRight size={13} />
          </a>
          <Button
            variant="ghost"
            shape="square"
            aria-label={
              resolvedAppearance === "dark" ? "切换浅色模式" : "切换深色模式"
            }
            onClick={() =>
              setAppearance(resolvedAppearance === "dark" ? "light" : "dark")
            }
          >
            {resolvedAppearance === "dark" ? (
              <Sun size={17} />
            ) : (
              <Moon size={17} />
            )}
          </Button>
          <span
            className="cf-avatar"
            title={
              auth?.logged_in
                ? settings.adminNickname || auth.username || "管理员"
                : "公开访客"
            }
          >
            {auth?.logged_in
              ? (settings.adminNickname || auth.username || "A")
                  .slice(0, 1)
                  .toUpperCase()
              : "G"}
          </span>
        </div>
      </header>
      {open && (
        <button
          className="cf-nav-backdrop"
          aria-label="关闭导航遮罩"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="console-sidebar"
        className={`cf-sidebar${open ? " is-open" : ""}`}
      >
        <div className="cf-workspace">
          <div className="cf-workspace-icon">
            <Server size={18} />
          </div>
          <div>
            <strong>服务器监控</strong>
            <span>CF-Server-Monitor</span>
          </div>
        </div>
        <div className="cf-nav-label">工作空间</div>
        <nav aria-label="主导航">
          <Link
            to="/"
            className={!isSettings && !isServer && !isAssets ? "is-active" : ""}
          >
            <LayoutDashboard size={17} />
            概览
          </Link>
          <Link to="/?section=servers" className={isServer ? "is-active" : ""}>
            <Server size={17} />
            服务器
          </Link>
          {(auth?.logged_in || settings.showPriceForGuests) && (
            <Link to="/assets" className={isAssets ? "is-active" : ""}>
              <Activity size={17} />
              资产概览
            </Link>
          )}
        </nav>
        <div className="cf-nav-label">偏好与管理</div>
        <nav aria-label="设置导航">
          <Link
            to="/?view=theme-manage"
            className={isSettings ? "is-active" : ""}
          >
            <Palette size={17} />
            主题设置
          </Link>
          {settings.enableAdminButton && (
            <a href={getAdminUrl()}>
              <ShieldCheck size={17} />
              管理后台
              <ArrowUpRight className="cf-nav-external" size={13} />
            </a>
          )}
        </nav>
        <div className="cf-sidebar-bottom">
          <a
            href="https://github.com/huilang-me/CF-Server-Monitor/blob/main/theme-develop.md"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            主题接入文档
            <ArrowUpRight size={13} />
          </a>
          <div className="cf-sidebar-signature">
            <Cloud size={18} />
            <span>CF style · Built with Kumo</span>
          </div>
        </div>
      </aside>
    </>
  );
}
