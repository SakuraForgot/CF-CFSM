import { Tabs, type TabsItem } from "@cloudflare/kumo/components/tabs";

/** One control surface for view, group, chart and time-range selection. */
export function ConsoleTabs({ label, value, onValueChange, items, variant = "segmented", className = "" }: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: TabsItem[];
  variant?: "segmented" | "underline";
  className?: string;
}) {
  return (
    <div className={`cf-tabs ${className}`} data-variant={variant} role="group" aria-label={label}>
      <Tabs
        size="sm"
        variant={variant}
        value={value}
        onValueChange={onValueChange}
        tabs={items}
        indicatorClassName="cf-tabs-indicator"
        labels={{ scrollStart: "向前滚动选项", scrollEnd: "向后滚动选项" }}
      />
    </div>
  );
}
