interface DataTableErrorMessageProps {
  /** Human-readable resource name (e.g. "work orders", "locations"). */
  resourceName: string
  /** Error from useQuery. */
  error: Error | null
}

/**
 * Standard error UI for dashboard list pages when the main query fails.
 * Use instead of duplicating the same div/p structure.
 */
export function DataTableErrorMessage({
  resourceName,
  error,
}: DataTableErrorMessageProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <p className="text-destructive">
        Failed to load {resourceName}: {error?.message ?? 'Unknown error'}
      </p>
    </div>
  )
}
