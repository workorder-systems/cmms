'use client';

import * as React from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { useSidebar } from '@workspace/ui/components/sidebar';

interface SidebarRailRightProps extends React.ComponentProps<'button'> {
  className?: string;
}

/**
 * SidebarRailRight - Custom rail component for the right sidebar
 * Toggles the right sidebar using the SidebarProvider context
 */
export function SidebarRailRight({ className, ...props }: SidebarRailRightProps) {
  const { setOpen, open } = useSidebar();

  const handleClick = React.useCallback(() => {
    setOpen(!open);
  }, [setOpen, open]);

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      data-side="right"
      aria-label="Toggle Right Sidebar"
      tabIndex={-1}
      onClick={handleClick}
      title="Toggle Right Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear left-0 cursor-e-resize after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "hover:bg-sidebar after:left-full",
        "-left-2",
        className
      )}
      {...props}
    />
  );
}
