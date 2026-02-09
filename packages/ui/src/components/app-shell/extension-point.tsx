'use client';

import * as React from 'react';
import { useAppShellStore } from './store';
import type { ExtensionPointName } from './types';

interface ExtensionPointProps {
  name: ExtensionPointName;
  children: React.ReactNode;
  priority?: number;
}

export function ExtensionPoint({
  name,
  children,
  priority = 0,
}: ExtensionPointProps) {
  const registerExtension = useAppShellStore(
    (state) => state.registerExtension
  );
  const contentRef = React.useRef(children);

  // Update ref when children change
  React.useEffect(() => {
    contentRef.current = children;
  }, [children]);

  React.useEffect(() => {
    // Register extension
    const unregister = registerExtension(name, contentRef.current, priority);
    return unregister;
  }, [name, priority, registerExtension]);

  // Nothing renders here - content goes to PortalTarget
  return null;
}
