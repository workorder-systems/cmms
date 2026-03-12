import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "../button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { cn } from "@workspace/ui/lib/utils";

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8",
        className,
      )}
      {...props}
    >
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span className="font-medium">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected
          </span>
        )}
        {table.getFilteredSelectedRowModel().rows.length === 0 && (
          <span>
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} result(s)
          </span>
        )}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-18 data-size:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-semibold text-sm text-foreground">
          Page <span className="mx-1 font-bold">{table.getState().pagination.pageIndex + 1}</span> of{" "}
          <span className="ml-1">{table.getPageCount()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden size-9 lg:flex transition-all hover:scale-105 disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-9 transition-all hover:scale-105 disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-9 transition-all hover:scale-105 disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-9 lg:flex transition-all hover:scale-105 disabled:opacity-40"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
