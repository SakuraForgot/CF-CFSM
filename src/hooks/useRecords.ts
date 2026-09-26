import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { getLoadRecords, getPingRecords } from "@/services/api";

const RECORD_QUERY_OPTIONS = {
  staleTime: 300_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

function useRecordQuery<T>(kind: "load" | "ping", fetcher: (
  uuid: string, hours: number, options: { signal: AbortSignal },
) => Promise<T>, uuid: string, hours: number, enabled: boolean) {
  const lastSuccess = useRef<{ uuid: string; hours: number; data: T } | undefined>(undefined);
  const query = useQuery({
    queryKey: ["records", kind, uuid, hours],
    queryFn: async ({ signal }) => ({ uuid, hours, data: await fetcher(uuid, hours, { signal }) }),
    // Keep both the data and its range together. Never show a different server's history.
    placeholderData: (previous) => previous?.uuid === uuid ? previous : undefined,
    ...RECORD_QUERY_OPTIONS,
    enabled: Boolean(uuid) && enabled,
  });
  useLayoutEffect(() => {
    if (query.data && !query.isPlaceholderData) lastSuccess.current = query.data;
  }, [query.data, query.isPlaceholderData]);
  // A failed range request must not erase the chart that was visible before it.
  const snapshot = query.data ?? (lastSuccess.current?.uuid === uuid ? lastSuccess.current : undefined);
  return {
    ...query,
    data: snapshot?.data,
    displayedHours: snapshot?.hours ?? hours,
    isPreviousRange: snapshot != null && snapshot.hours !== hours,
    isLoading: query.isLoading && !snapshot,
  };
}

export function useLoadRecords(uuid: string, hours = 6, enabled = true) {
  return useRecordQuery("load", getLoadRecords, uuid, hours, enabled);
}

// stats 已并入 getPingRecords 的同一次请求(response.stats),不再单独发起查询。
export function usePingRecords(uuid: string, hours = 6, enabled = true) {
  return useRecordQuery("ping", getPingRecords, uuid, hours, enabled);
}
