import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { DirectionProvider } from './direction';
import { Button } from './button';

const meta = {
  title: 'Primitives/Direction',
  component: DirectionProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DirectionProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Direction provider with LTR (left-to-right) direction.
 */
export const LTR: Story = {
  render: () => (
    <DirectionProvider dir="ltr">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">Left-to-Right Layout</div>
        <div className="flex gap-2">
          <Button>Previous</Button>
          <Button>Next</Button>
        </div>
      </div>
    </DirectionProvider>
  ),
};

/**
 * Direction provider with RTL (right-to-left) direction.
 */
export const RTL: Story = {
  render: () => (
    <DirectionProvider dir="rtl">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">Right-to-Left Layout</div>
        <div className="flex gap-2">
          <Button>Previous</Button>
          <Button>Next</Button>
        </div>
      </div>
    </DirectionProvider>
  ),
};
