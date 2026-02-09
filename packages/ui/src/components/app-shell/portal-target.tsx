'use client';

import * as React from 'react';
import { useAppShellStore } from './store';
import type { ExtensionPointName } from './types';
import { cn } from '@workspace/ui/lib/utils';

interface PortalTargetProps {
  name: ExtensionPointName;
  className?: string;
}

export function PortalTarget({ name, className }: PortalTargetProps) {
  // Subscribe to extensions Map (stable selector for SSR)
  const extensionsMap = useAppShellStore((state) => state.extensions);
  
  // Derive extensions for this specific name using useMemo
  const extensions = React.useMemo(
    () => extensionsMap.get(name) || [],
    [extensionsMap, name]
  );

  return (
    <div data-extension-point={name} className={cn(className)}>
      {extensions.map((ext) => (
        <React.Fragment key={ext.id}>{ext.content}</React.Fragment>
      ))}
    </div>
  );
}
