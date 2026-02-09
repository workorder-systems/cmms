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

interface AppShellProps {
  children: React.ReactNode;
  leftSidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  rightSidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  leftSidebarVariant?: 'sidebar' | 'floating' | 'inset';
  rightSidebarVariant?: 'sidebar' | 'floating' | 'inset';
  className?: string;
}

export function AppShell({
  children,
  leftSidebarCollapsible = 'icon',
  rightSidebarCollapsible = 'none',
  leftSidebarVariant = 'inset',
  rightSidebarVariant = 'inset',
  className,
}: AppShellProps) {
  // Subscribe to extensions Map (stable selector for SSR)
  const extensionsMap = useAppShellStore((state) => state.extensions);
  
  // Derive hasRightSidebarExtensions using useMemo
  const hasRightSidebarExtensions = React.useMemo(
    () =>
      extensionsMap.has('sidebar.right.header') ||
      extensionsMap.has('sidebar.right.content') ||
      extensionsMap.has('sidebar.right.footer'),
    [extensionsMap]
  );
  
  const rightSidebarOpen = useAppShellStore((state) => state.rightSidebarOpen);
  const setRightSidebarOpen = useAppShellStore((state) => state.setRightSidebarOpen);
  
  // Force close right sidebar when there are no extensions
  const effectiveRightSidebarOpen = hasRightSidebarExtensions ? rightSidebarOpen : false;

  // Handle right sidebar open change
  const handleRightSidebarOpenChange = React.useCallback((open: boolean) => {
    // Only allow opening if there are extensions
    if (open && hasRightSidebarExtensions) {
      setRightSidebarOpen(true);
    } else {
      setRightSidebarOpen(false);
    }
  }, [hasRightSidebarExtensions, setRightSidebarOpen]);

  return (
    <>
      {/* Left Sidebar - Always visible */}
      <Sidebar variant={leftSidebarVariant} collapsible={leftSidebarCollapsible} className={className}>
        <SidebarHeader>
          <PortalTarget name="sidebar.left.header" />
        </SidebarHeader>
        <SidebarContent>
          <PortalTarget name="sidebar.left.content" />
        </SidebarContent>
        <SidebarFooter>
          <PortalTarget name="sidebar.left.footer" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="min-h-0 overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] duration-300 ease-in-out group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <PortalTarget name="header.left" />
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            <PortalTarget name="header.right" />
          </div>
        </header>
        <div className="flex flex-col gap-4 p-4 pt-0 min-h-0 w-full max-w-full overflow-x-hidden">
          <PortalTarget name="page.header" />
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      </SidebarInset>

      {/* Right Sidebar - Only visible when extensions exist */}
      {hasRightSidebarExtensions && (
        <SidebarProvider
          defaultOpen={rightSidebarOpen}
          open={rightSidebarOpen}
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
    </>
  );
}
