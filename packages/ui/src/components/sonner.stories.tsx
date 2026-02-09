import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Toaster } from './sonner';
import { toast } from 'sonner';
import { Button } from './button';

const meta = {
  title: 'Feedback/Sonner',
  component: Toaster,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic toast notification.
 * The Toaster component must be rendered once in your app root.
 */
export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Toaster />
      <Button
        onClick={() => toast('Event has been created.')}
      >
        Show Toast
      </Button>
    </div>
  ),
};

/**
 * Different toast types: success, error, warning, info, and loading.
 */
export const Types: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Toaster />
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => toast.success('Success!')}
        >
          Success
        </Button>
        <Button
          onClick={() => toast.error('Error!')}
        >
          Error
        </Button>
        <Button
          onClick={() => toast.warning('Warning!')}
        >
          Warning
        </Button>
        <Button
          onClick={() => toast.info('Info')}
        >
          Info
        </Button>
        <Button
          onClick={() => {
            const toastId = toast.loading('Loading...');
            setTimeout(() => {
              toast.success('Loaded!', { id: toastId });
            }, 2000);
          }}
        >
          Loading
        </Button>
      </div>
    </div>
  ),
};

/**
 * Toast with description text.
 */
export const Description: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Toaster />
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => toast('Event has been created', {
            description: 'Monday, January 3rd at 6:00pm',
          })}
        >
          With Description
        </Button>
        <Button
          onClick={() => toast.success('Success!', {
            description: 'Your changes have been saved.',
          })}
        >
          Success with Description
        </Button>
        <Button
          onClick={() => toast.error('Error!', {
            description: 'Something went wrong. Please try again.',
          })}
        >
          Error with Description
        </Button>
        <Button
          onClick={() => toast('Event has been created', {
            description: 'Monday, January 3rd at 6:00pm',
            action: {
              label: 'Undo',
              onClick: () => console.log('Undo'),
            },
          })}
        >
          With Action
        </Button>
      </div>
    </div>
  ),
};

/**
 * Toast positions: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right.
 * Use the `position` prop on the Toaster component to change the default position.
 */
export const Position: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Toaster position="top-right" />
      <div className="flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">
          Use the <code className="text-xs bg-muted px-1 py-0.5 rounded">position</code> prop on the Toaster component to change the position.
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => toast('Top Left', { position: 'top-left' })}
            variant="outline"
            size="sm"
          >
            Top Left
          </Button>
          <Button
            onClick={() => toast('Top Center', { position: 'top-center' })}
            variant="outline"
            size="sm"
          >
            Top Center
          </Button>
          <Button
            onClick={() => toast('Top Right', { position: 'top-right' })}
            variant="outline"
            size="sm"
          >
            Top Right
          </Button>
          <Button
            onClick={() => toast('Bottom Left', { position: 'bottom-left' })}
            variant="outline"
            size="sm"
          >
            Bottom Left
          </Button>
          <Button
            onClick={() => toast('Bottom Center', { position: 'bottom-center' })}
            variant="outline"
            size="sm"
          >
            Bottom Center
          </Button>
          <Button
            onClick={() => toast('Bottom Right', { position: 'bottom-right' })}
            variant="outline"
            size="sm"
          >
            Bottom Right
          </Button>
        </div>
      </div>
    </div>
  ),
};
