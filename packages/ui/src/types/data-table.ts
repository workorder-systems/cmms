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
