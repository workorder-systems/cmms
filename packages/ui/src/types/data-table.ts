import type { ComponentType } from "react";
import type { ColumnFilter, ColumnSort } from "@tanstack/react-table";

import type { FilterOperator } from "../config/data-table";

export type ExtendedColumnSort<TData> = ColumnSort & {
  id: keyof TData | string;
};

export interface ExtendedColumnFilter<TData> extends ColumnFilter {
  operator: FilterOperator;
}

export interface QueryKeys {
  page?: string;
  perPage?: string;
  sort?: string;
  filters?: string;
  joinOperator?: string;
}

export type { FilterOperator, FilterVariant } from "../config/data-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    queryKeys?: QueryKeys;
  }
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
