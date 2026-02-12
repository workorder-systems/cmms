'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarRail,
  SidebarProvider,
} from '@workspace/ui/components/sidebar';
import { PortalTarget } from './portal-target';
import { useAppShellStore } from './store';
import { cn } from '@workspace/ui/lib/utils';
import { SidebarRailRight } from './sidebar-rail-right';
import type { AppShellStore } from './types';

interface AppShellProps {
  children: React.ReactNode;
  /** Left sidebar header (e.g. tenant switcher). Falls back to PortalTarget if not provided. */
  leftSidebarHeader?: React.ReactNode;
  /** Left sidebar main content (e.g. nav). Falls back to PortalTarget if not provided. */
  leftSidebarContent?: React.ReactNode;
  /** Left sidebar footer (e.g. user menu). Falls back to PortalTarget if not provided. */
  leftSidebarFooter?: React.ReactNode;
  /** Header left slot (e.g. breadcrumb + trigger). Rendered before PortalTarget header.right. */
  headerLeft?: React.ReactNode;
  leftSidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  rightSidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  leftSidebarVariant?: 'sidebar' | 'floating' | 'inset';
  rightSidebarVariant?: 'sidebar' | 'floating' | 'inset';
  className?: string;
}

export function AppShell({
  children,
  leftSidebarHeader,
  leftSidebarContent,
  leftSidebarFooter,
  headerLeft,
  leftSidebarCollapsible = 'icon',
  rightSidebarCollapsible = 'none',
  leftSidebarVariant = 'inset',
  rightSidebarVariant = 'inset',
  className,
}: AppShellProps) {
  const extensionsMap = useAppShellStore((state: AppShellStore) => state.extensions);
  const hasRightSidebarExtensions = React.useMemo(
    () =>
      extensionsMap.has('sidebar.right.header') ||
      extensionsMap.has('sidebar.right.content') ||
      extensionsMap.has('sidebar.right.footer'),
    [extensionsMap]
  );

  const leftSidebarOpen = useAppShellStore((state: AppShellStore) => state.leftSidebarOpen);
  const setLeftSidebarOpen = useAppShellStore((state: AppShellStore) => state.setLeftSidebarOpen);
  const rightSidebarOpen = useAppShellStore((state: AppShellStore) => state.rightSidebarOpen);
  const setRightSidebarOpen = useAppShellStore((state: AppShellStore) => state.setRightSidebarOpen);

  const effectiveRightSidebarOpen = hasRightSidebarExtensions ? rightSidebarOpen : false;

  const handleRightSidebarOpenChange = React.useCallback(
    (open: boolean) => {
      if (open && hasRightSidebarExtensions) {
        setRightSidebarOpen(true);
      } else {
        setRightSidebarOpen(false);
      }
    },
    [hasRightSidebarExtensions, setRightSidebarOpen]
  );

  return (
    <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
      <Sidebar
        variant={leftSidebarVariant}
        collapsible={leftSidebarCollapsible}
        className={className}
      >
        <SidebarHeader>
          {leftSidebarHeader !== undefined ? leftSidebarHeader : <PortalTarget name="sidebar.left.header" />}
        </SidebarHeader>
        <SidebarContent>
          {leftSidebarContent !== undefined ? leftSidebarContent : <PortalTarget name="sidebar.left.content" />}
        </SidebarContent>
        <SidebarFooter>
          {leftSidebarFooter !== undefined ? leftSidebarFooter : <PortalTarget name="sidebar.left.footer" />}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-0 overflow-x-hidden">
        <header className="flex h-16 shrink-0 border-b items-center justify-between gap-2 px-4 transition-[width,height] duration-300 ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {headerLeft !== undefined ? headerLeft : <PortalTarget name="header.left" />}
          </div>
          <div className="flex items-center gap-2">
            <PortalTarget name="header.right" />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
          <PortalTarget name="page.header" />
          <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden">
            {children}
          </div>
        </div>
      </SidebarInset>

      {hasRightSidebarExtensions && (
        <SidebarProvider
          defaultOpen={effectiveRightSidebarOpen}
          open={effectiveRightSidebarOpen}
          onOpenChange={handleRightSidebarOpenChange}
          className="contents"
        >
          <Sidebar
            variant={rightSidebarVariant}
            collapsible={rightSidebarCollapsible}
            side="right"
            className={cn(
              'sticky top-0 h-svh',
              rightSidebarVariant !== 'inset' && 'border-l'
            )}
          >
            <SidebarHeader>
              <PortalTarget name="sidebar.right.header" />
            </SidebarHeader>
            <SidebarContent>
              <PortalTarget name="sidebar.right.content" />
            </SidebarContent>
            <SidebarFooter>
              <PortalTarget name="sidebar.right.footer" />
            </SidebarFooter>
            <SidebarRailRight />
          </Sidebar>
        </SidebarProvider>
      )}
    </SidebarProvider>
  );
}
