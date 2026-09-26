// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLoadRecords, getPingRecords } from "@/services/api";
import { useLoadRecords, usePingRecords } from "../useRecords";

vi.mock("@/services/api", () => ({ getLoadRecords: vi.fn(), getPingRecords: vi.fn() }));
function deferred() {
  const result = { count: 6, records: [], tasks: [], stats: [] };
  let resolve!: (value: typeof result) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<typeof result>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve: (count = 6) => resolve({ ...result, count }), reject };
}

describe.each([
  ["load", useLoadRecords, getLoadRecords],
  ["ping", usePingRecords, getPingRecords],
] as const)("%s history continuity", (_kind, useRecords, fetchRecords) => {
  let root: Root;
  let host: HTMLDivElement;
  let client: QueryClient;
  let latest: ReturnType<typeof useRecords>;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(fetchRecords).mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    host = document.createElement("div");
    root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); client.clear(); vi.unstubAllGlobals(); });
  function Probe({ uuid, hours }: { uuid: string; hours: number }) {
    latest = useRecords(uuid, hours);
    return latest.isLoading ? createElement("p", null, "loading") :
      createElement("section", null, `${latest.data?.count}:${latest.displayedHours}`);
  }
  async function settle() { await act(async () => { await new Promise((done) => setTimeout(done, 10)); }); }
  async function render(uuid: string, hours: number) {
    await act(async () => root.render(createElement(QueryClientProvider, {
      client, children: createElement(Probe, { uuid, hours }),
    })));
    await settle();
  }
  async function seed() {
    vi.mocked(fetchRecords).mockResolvedValueOnce({ count: 1, records: [], tasks: [], stats: [] });
    await render("tokyo", 1);
  }
  it("retains the mounted panel and old range until the requested data arrives", async () => {
    await seed();
    const panel = host.querySelector("section");
    const request = deferred();
    vi.mocked(fetchRecords).mockReturnValueOnce(request.promise);
    await render("tokyo", 6);
    expect(latest.isPreviousRange).toBe(true);
    expect(latest.isFetching).toBe(true);
    expect(host.querySelector("section")).toBe(panel);
    expect(host.textContent).toBe("1:1");
    request.resolve(); await settle();
    expect(host.textContent).toBe("6:6");
    expect(host.querySelector("section")).toBe(panel);
    expect(latest.isPreviousRange).toBe(false);
  });
  it("never retains another server's data", async () => {
    await seed();
    vi.mocked(fetchRecords).mockReturnValueOnce(deferred().promise);
    await render("frankfurt", 6);
    expect(latest.data).toBeUndefined();
    expect(host.textContent).toBe("loading");
  });
  it("retains the previous range on error and recovers on retry", async () => {
    await seed();
    vi.mocked(fetchRecords).mockRejectedValueOnce(new Error("offline"));
    await render("tokyo", 6);
    expect(latest.isError).toBe(true);
    expect(latest.isPreviousRange).toBe(true);
    expect(host.textContent).toBe("1:1");
    vi.mocked(fetchRecords).mockResolvedValueOnce({ count: 6, records: [], tasks: [], stats: [] });
    await act(async () => { await latest.refetch(); }); await settle();
    expect(host.textContent).toBe("6:6");
    expect(latest.isError).toBe(false);
  });
  it("ignores a late response after rapid range changes", async () => {
    await seed();
    const six = deferred(), twelve = deferred();
    vi.mocked(fetchRecords).mockReturnValueOnce(six.promise).mockReturnValueOnce(twelve.promise);
    await render("tokyo", 6); await render("tokyo", 12);
    expect(host.textContent).toBe("1:1");
    twelve.resolve(12); await settle();
    six.resolve(6); await settle();
    expect(host.textContent).toBe("12:12");
  });
});
