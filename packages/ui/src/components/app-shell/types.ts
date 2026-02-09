import type * as React from 'react';

export type ExtensionPointName =
  | 'sidebar.left.header'
  | 'sidebar.left.content'
  | 'sidebar.left.footer'
  | 'sidebar.right.header'
  | 'sidebar.right.content'
  | 'sidebar.right.footer'
  | 'header.left'
  | 'header.right'
  | 'page.header';

export interface Extension {
  id: string;
  content: React.ReactNode;
  priority: number;
}

export interface AppShellStore {
  // Extension registry
  extensions: Map<ExtensionPointName, Extension[]>;

  // Left sidebar state
  leftSidebarOpen: boolean;
  leftSidebarState: 'expanded' | 'collapsed';

  // Right sidebar state
  rightSidebarOpen: boolean;
  rightSidebarState: 'expanded' | 'collapsed';

  // Actions
  registerExtension: (
    name: ExtensionPointName,
    content: React.ReactNode,
    priority?: number
  ) => () => void;

  unregisterExtension: (name: ExtensionPointName, id: string) => void;

  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;

  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  closeRightSidebar: () => void;

  // Computed
  hasRightSidebarExtensions: () => boolean;
  getExtensions: (name: ExtensionPointName) => Extension[];
}
