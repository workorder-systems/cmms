'use client';

import { create } from 'zustand';
import type { AppShellStore, ExtensionPointName, Extension } from './types';

export const useAppShellStore = create<AppShellStore>((set, get) => ({
  extensions: new Map(),

  leftSidebarOpen: true,
  leftSidebarState: 'expanded',

  rightSidebarOpen: true,
  rightSidebarState: 'expanded',

  registerExtension: (name, content, priority = 0) => {
    const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const extension: Extension = { id, content, priority };

    set((state) => {
      const current = state.extensions.get(name) || [];
      const updated = [...current, extension].sort(
        (a, b) => a.priority - b.priority
      );
      const newExtensions = new Map(state.extensions);
      newExtensions.set(name, updated);

      return { extensions: newExtensions };
    });

    // Return unregister function
    return () => get().unregisterExtension(name, id);
  },

  unregisterExtension: (name, id) => {
    set((state) => {
      const current = state.extensions.get(name) || [];
      const filtered = current.filter((ext) => ext.id !== id);
      const newExtensions = new Map(state.extensions);

      if (filtered.length === 0) {
        newExtensions.delete(name);
      } else {
        newExtensions.set(name, filtered);
      }

      return { extensions: newExtensions };
    });
  },

  toggleLeftSidebar: () => {
    set((state) => ({
      leftSidebarOpen: !state.leftSidebarOpen,
      leftSidebarState: state.leftSidebarOpen ? 'collapsed' : 'expanded',
    }));
  },

  setLeftSidebarOpen: (open) => {
    set({
      leftSidebarOpen: open,
      leftSidebarState: open ? 'expanded' : 'collapsed',
    });
  },

  toggleRightSidebar: () => {
    set((state) => ({
      rightSidebarOpen: !state.rightSidebarOpen,
      rightSidebarState: state.rightSidebarOpen ? 'collapsed' : 'expanded',
    }));
  },

  setRightSidebarOpen: (open) => {
    set({
      rightSidebarOpen: open,
      rightSidebarState: open ? 'expanded' : 'collapsed',
    });
  },

  closeRightSidebar: () => {
    set({
      rightSidebarOpen: false,
      rightSidebarState: 'collapsed',
    });
  },

  hasRightSidebarExtensions: () => {
    const { extensions } = get();
    return (
      extensions.has('sidebar.right.header') ||
      extensions.has('sidebar.right.content') ||
      extensions.has('sidebar.right.footer')
    );
  },

  getExtensions: (name) => {
    return get().extensions.get(name) || [];
  },
}));
