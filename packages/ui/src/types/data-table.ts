import type { ComponentType } from "react";
import type { ColumnSort } from "@tanstack/react-table";

export type ExtendedColumnSort<TData> = ColumnSort & {
  id: keyof TData | string;
};

export interface QueryKeys {
  page?: string;
  perPage?: string;
  sort?: string;
  filters?: string;
  joinOperator?: string;
}

/** Option for select/multiSelect filters. Optional color shows a dot in the faceted filter. */
export interface Option {
  label: string;
  value: string;
  /** Optional hex color (#RGB or #RRGGBB) – shown as a dot in the filter dropdown and trigger badges. */
  color?: string | null;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
}
