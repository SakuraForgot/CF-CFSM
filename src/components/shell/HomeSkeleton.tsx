export function HomeSkeleton() {
  return (
    <div className="cf-skeleton" role="status" aria-label="正在加载监控数据">
      <div className="cf-skeleton-title" />
      <div className="cf-metrics">
        {[0, 1, 2, 3].map((i) => (
          <div className="cf-metric" key={i}>
            <div />
            <div />
            <div />
          </div>
        ))}
      </div>
      <div className="cf-insights">
        <div className="cf-panel" />
        <div className="cf-panel" />
      </div>
      <div className="cf-panel cf-skeleton-table" />
    </div>
  );
}
