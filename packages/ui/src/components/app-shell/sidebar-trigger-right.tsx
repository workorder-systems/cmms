'use client';

import * as React from 'react';
import { PanelRightIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { useAppShell } from './hooks';

interface SidebarTriggerRightProps extends React.ComponentProps<typeof Button> {}

/**
 * SidebarTriggerRight - Toggle button for the right sidebar
 * Similar to SidebarTrigger but controls the right sidebar via AppShell store
 */
export function SidebarTriggerRight({
  className,
  onClick,
  ...props
}: SidebarTriggerRightProps) {
  const { rightSidebar } = useAppShell();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger-right"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event);
        rightSidebar.toggle();
      }}
      {...props}
    >
      <PanelRightIcon />
      <span className="sr-only">Toggle Right Sidebar</span>
    </Button>
  );
}
