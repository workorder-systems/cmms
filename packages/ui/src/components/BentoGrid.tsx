'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';

/** Responsive breakpoint values for bento grid layout. */
export type BentoBreakpoints = {
  base?: number | string;
  md?: number | string;
  lg?: number | string;
};

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns per breakpoint (base, md, lg). */
  cols?: BentoBreakpoints;
  /** Row height per breakpoint. Values are used in grid-auto-rows (e.g. "60px", "minmax(80px, auto)"). */
  rowHeight?: BentoBreakpoints;
}

const COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};
const COLS_MD_CLASS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};
const COLS_LG_CLASS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

function buildGridColsClass(cols: BentoBreakpoints | undefined): string {
  if (!cols) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  const classes: string[] = [];
  const base = typeof cols.base === 'number' ? cols.base : undefined;
  const md = typeof cols.md === 'number' ? cols.md : undefined;
  const lg = typeof cols.lg === 'number' ? cols.lg : undefined;
  if (base != null && COLS_CLASS[base]) classes.push(COLS_CLASS[base]);
  if (md != null && COLS_MD_CLASS[md]) classes.push(COLS_MD_CLASS[md]);
  if (lg != null && COLS_LG_CLASS[lg]) classes.push(COLS_LG_CLASS[lg]);
  return classes.length ? classes.join(' ') : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

function parseRowHeightValue(v: number | string | undefined): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return `${v}px`;
  return v;
}

function buildAutoRowsClass(rowHeight: BentoBreakpoints | undefined): string {
  if (!rowHeight) return 'auto-rows-[80px] md:auto-rows-[100px] lg:auto-rows-[120px]';
  const classes: string[] = [];
  const base = parseRowHeightValue(rowHeight.base);
  const md = parseRowHeightValue(rowHeight.md);
  const lg = parseRowHeightValue(rowHeight.lg);
  if (base === '60px') classes.push('auto-rows-[60px]');
  else if (base === '80px') classes.push('auto-rows-[80px]');
  else if (base === '100px') classes.push('auto-rows-[100px]');
  else if (base === '120px') classes.push('auto-rows-[120px]');
  if (md === '60px') classes.push('md:auto-rows-[60px]');
  else if (md === '80px') classes.push('md:auto-rows-[80px]');
  else if (md === '100px') classes.push('md:auto-rows-[100px]');
  else if (md === '120px') classes.push('md:auto-rows-[120px]');
  if (lg === '60px') classes.push('lg:auto-rows-[60px]');
  else if (lg === '80px') classes.push('lg:auto-rows-[80px]');
  else if (lg === '100px') classes.push('lg:auto-rows-[100px]');
  else if (lg === '120px') classes.push('lg:auto-rows-[120px]');
  return classes.length ? classes.join(' ') : 'auto-rows-[80px] md:auto-rows-[100px] lg:auto-rows-[120px]';
}

export const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ cols, rowHeight, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid w-full gap-4',
        buildGridColsClass(cols),
        buildAutoRowsClass(rowHeight),
        className
      )}
      {...props}
    />
  )
);
BentoGrid.displayName = 'BentoGrid';

export interface BentoGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns this item spans (default 1). */
  colSpan?: number;
  /** Number of rows this item spans (default 1). */
  rowSpan?: number;
}

const colSpanClass: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
};
const rowSpanClass: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
};

export const BentoGridItem = React.forwardRef<HTMLDivElement, BentoGridItemProps>(
  ({ colSpan = 1, rowSpan = 1, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-h-0 min-w-0 items-center justify-center rounded-xl border bg-card p-4 text-card-foreground shadow-sm',
        colSpan in colSpanClass ? colSpanClass[colSpan as keyof typeof colSpanClass] : 'col-span-1',
        rowSpan in rowSpanClass ? rowSpanClass[rowSpan as keyof typeof rowSpanClass] : 'row-span-1',
        className
      )}
      {...props}
    />
  )
);
BentoGridItem.displayName = 'BentoGridItem';
