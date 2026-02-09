'use client';

import * as React from 'react';
import { SidebarTriggerRight } from './sidebar-trigger-right';
import { Separator } from '@workspace/ui/components/separator';
import { useAppShell } from './hooks';

/**
 * HeaderRightSidebarTrigger - Conditionally renders the right sidebar toggle
 * Only shows when there are right sidebar extensions registered
 */
export function HeaderRightSidebarTrigger() {
  const { rightSidebar } = useAppShell();

  if (!rightSidebar.hasExtensions) {
    return null;
  }

  return (
    <>
      <Separator orientation="vertical" className="h-4" />
      <SidebarTriggerRight />
    </>
  );
}
