import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Portal } from './portal';
import { Button } from './button';

const meta = {
  title: 'Primitives/Portal',
  component: Portal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Portal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Portal renders its children into a different DOM node.
 * This is useful for modals, tooltips, and other overlays.
 * 
 * Note: This component is typically used internally by other components
 * like Dialog, Popover, etc. It's shown here for demonstration.
 */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Dialog (uses Portal)</Button>
        {open && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-lg border p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold">Portal Example</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  This content is rendered in a portal, outside the normal DOM hierarchy.
                </p>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>
          </Portal>
        )}
      </div>
    );
  },
};

/**
 * Portal with custom container.
 */
export const CustomContainer: Story = {
  render: () => {
    const [container, setContainer] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
      const div = document.createElement('div');
      div.id = 'custom-portal-container';
      div.style.position = 'fixed';
      div.style.top = '20px';
      div.style.right = '20px';
      div.style.zIndex = '9999';
      document.body.appendChild(div);
      setContainer(div);

      return () => {
        document.body.removeChild(div);
      };
    }, []);

    return (
      <div>
        <div className="mb-4 text-sm text-muted-foreground">
          Portal content will appear in the top-right corner.
        </div>
        {container && (
          <Portal container={container}>
            <div className="bg-background rounded-lg border p-4 shadow-lg">
              <p className="text-sm">This is rendered in a custom container.</p>
            </div>
          </Portal>
        )}
      </div>
    );
  },
};

/**
 * Header with a top-right slot for actions (e.g. "New work order").
 * The slot is a DOM node; page content can portal a button into it.
 * In the app, PortalTarget + ExtensionPoint provide this pattern.
 */
export const HeaderRightSlot: Story = {
  render: () => {
    const [headerRightRef, setHeaderRightRef] = React.useState<HTMLDivElement | null>(null);

    return (
      <div className="w-full max-w-2xl rounded-lg border">
        <header
          className="flex h-14 shrink-0 items-center justify-between gap-2 px-4"
          aria-label="Page header"
        >
          <span className="font-semibold">Work orders</span>
          <div
            ref={setHeaderRightRef}
            className="flex items-center gap-2"
            data-slot="header.right"
          />
        </header>
        {headerRightRef && (
          <Portal container={headerRightRef}>
            <Button size="sm">New work order</Button>
          </Portal>
        )}
        <div className="border-t p-4 text-sm text-muted-foreground">
          Page content. The &quot;New work order&quot; button above is portaled into header.right.
        </div>
      </div>
    );
  },
};
