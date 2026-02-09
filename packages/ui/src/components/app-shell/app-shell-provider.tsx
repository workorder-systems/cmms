'use client';

import * as React from 'react';
import { SidebarProvider } from '@workspace/ui/components/sidebar';
import { useAppShellStore } from './store';

interface AppShellProviderProps {
  children: React.ReactNode;
  defaultLeftSidebarOpen?: boolean;
  defaultRightSidebarOpen?: boolean;
}

export function AppShellProvider({
  children,
  defaultLeftSidebarOpen = true,
  defaultRightSidebarOpen = true,
}: AppShellProviderProps) {
  const setLeftSidebarOpen = useAppShellStore(
    (state) => state.setLeftSidebarOpen
  );
  const setRightSidebarOpen = useAppShellStore(
    (state) => state.setRightSidebarOpen
  );

  React.useEffect(() => {
    setLeftSidebarOpen(defaultLeftSidebarOpen);
    setRightSidebarOpen(defaultRightSidebarOpen);
  }, [
    defaultLeftSidebarOpen,
    defaultRightSidebarOpen,
    setLeftSidebarOpen,
    setRightSidebarOpen,
  ]);

  return (
    <SidebarProvider defaultOpen={defaultLeftSidebarOpen}>
      {children}
    </SidebarProvider>
  );
}
