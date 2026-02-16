import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import { Inbox, SearchX } from "lucide-react";
import type * as React from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../empty";
import { DataTablePagination } from "./data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
import { getColumnPinningStyle } from "@workspace/ui/lib/data-grid";
import { cn } from "@workspace/ui/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  return (
    <div
      className={cn("flex w-full flex-col gap-2.5", className)}
      {...props}
    >
      {children}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getColumnPinningStyle({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getColumnPinningStyle({ column: cell.column }),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="p-0"
                >
                  {(() => {
                    const hasActiveFilters =
                      table.getState().columnFilters.length > 0;
                    return (
                      <Empty className="min-h-[200px] rounded-none border-0">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            {hasActiveFilters ? (
                              <SearchX />
                            ) : (
                              <Inbox />
                            )}
                          </EmptyMedia>
                          <EmptyTitle>
                            {hasActiveFilters
                              ? "No results"
                              : "No items yet"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {hasActiveFilters
                              ? "Try adjusting your search or filter to find what you're looking for."
                              : "Get started by adding your first item."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    );
                  })()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
