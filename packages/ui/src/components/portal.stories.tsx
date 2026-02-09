import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Portal } from './portal';
import { Button } from './button';
import { Dialog, DialogContent, DialogTrigger } from './dialog';

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
