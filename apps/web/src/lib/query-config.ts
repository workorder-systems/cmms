/**
 * TanStack Query defaults and constants.
 *
 * Goals: reduce unnecessary network requests while keeping UI fresh after mutations.
 *
 * - Default staleTime: data is "fresh" for this period; no refetch on remount or
 *   window focus. After mutations we explicitly invalidate/refetch, so lists stay correct.
 * - refetchOnWindowFocus: false to avoid refetches when switching back to the tab.
 *   Rely on invalidation after mutations and manual refresh where needed.
 * - Individual queries can override (e.g. catalogs use 1h staleTime in catalog-queries.ts).
 *
 * Usage:
 * - Use useMutation for creates/updates/deletes; in onSuccess call
 *   queryClient.invalidateQueries({ queryKey }) (and refetchQueries when the next
 *   screen must show fresh data before mount).
 * - Use stable query keys (e.g. workOrdersListQueryKey) so the same cache entry
 *   is shared across routes and invalidation hits the right queries.
 * - Override staleTime only for long-lived reference data (catalogs, permissions).
 */

/** Default: consider list/detail data fresh for 2 minutes (no refetch on remount/focus). */
export const DEFAULT_STALE_TIME_MS = 1000 * 60 * 2

/** Default: keep unused query data in cache for 5 minutes. */
export const DEFAULT_GC_TIME_MS = 1000 * 60 * 5

export const queryClientDefaultOptions = {
  queries: {
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnWindowFocus: false,
    /** Still refetch on mount when data is stale (after staleTime has passed). */
    refetchOnMount: true,
  },
} as const
