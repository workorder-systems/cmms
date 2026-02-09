'use client';

import * as React from 'react';
import { useAppShellStore } from './store';
import type { ExtensionPointName } from './types';

export function useAppShell() {
  const leftSidebarOpen = useAppShellStore((state) => state.leftSidebarOpen);
  const leftSidebarState = useAppShellStore((state) => state.leftSidebarState);
  const rightSidebarOpen = useAppShellStore((state) => state.rightSidebarOpen);
  const rightSidebarState = useAppShellStore((state) => state.rightSidebarState);
  
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

  return {
    // Extension management
    registerExtension: useAppShellStore((state) => state.registerExtension),
    unregisterExtension: useAppShellStore(
      (state) => state.unregisterExtension
    ),
    getExtensions: useAppShellStore((state) => state.getExtensions),

    // Left sidebar
    leftSidebar: {
      open: leftSidebarOpen,
      state: leftSidebarState,
      toggle: useAppShellStore((state) => state.toggleLeftSidebar),
      setOpen: useAppShellStore((state) => state.setLeftSidebarOpen),
    },

    // Right sidebar
    rightSidebar: {
      open: rightSidebarOpen,
      state: rightSidebarState,
      toggle: useAppShellStore((state) => state.toggleRightSidebar),
      setOpen: useAppShellStore((state) => state.setRightSidebarOpen),
      close: useAppShellStore((state) => state.closeRightSidebar),
      hasExtensions: hasRightSidebarExtensions,
    },
  };
}

export function useExtensionPoint(name: ExtensionPointName) {
  // Subscribe to extensions Map (stable selector for SSR)
  const extensionsMap = useAppShellStore((state) => state.extensions);
  
  // Derive extensions for this specific name using useMemo
  const extensions = React.useMemo(
    () => extensionsMap.get(name) || [],
    [extensionsMap, name]
  );

  return {
    extensions,
    hasExtensions: extensions.length > 0,
  };
}
