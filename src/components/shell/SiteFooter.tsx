import { usePublicConfig } from "@/hooks/usePublicConfig";

export function SiteFooter() {
  const { data } = usePublicConfig();
  return (
    <footer className="cf-footer">
      <span>
        Powered by{" "}
        <a
          href="https://github.com/huilang-me/CF-Server-Monitor/"
          target="_blank"
          rel="noreferrer"
        >
          CF-Server-Monitor
        </a>
        {data?.version ? ` · ${data.version}` : ""}
      </span>
      <span>CFSM Cloud · Kumo design</span>
    </footer>
  );
}
