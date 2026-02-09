import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Hitbox } from './hitbox';
import { Button } from './button';

const meta = {
  title: 'Primitives/Hitbox',
  component: Hitbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Hitbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hitbox extends the clickable area around a button.
 * This is useful for improving touch targets on mobile devices.
 */
export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        The hitbox extends the clickable area by 12px (default) on all sides.
      </div>
      <Hitbox>
        <Button>Button with Hitbox</Button>
      </Hitbox>
    </div>
  ),
};

/**
 * Hitbox with different sizes.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Hitbox size="sm">
        <Button size="sm">Small Hitbox</Button>
      </Hitbox>
      <Hitbox size="default">
        <Button>Default Hitbox</Button>
      </Hitbox>
      <Hitbox size="lg">
        <Button size="lg">Large Hitbox</Button>
      </Hitbox>
    </div>
  ),
};

/**
 * Hitbox with different positions.
 */
export const Positions: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground mb-2">Top</div>
      <Hitbox position="top" debug>
        <Button>Top Hitbox</Button>
      </Hitbox>
      <div className="text-sm text-muted-foreground mb-2">Bottom</div>
      <Hitbox position="bottom" debug>
        <Button>Bottom Hitbox</Button>
      </Hitbox>
      <div className="text-sm text-muted-foreground mb-2">Left</div>
      <Hitbox position="left" debug>
        <Button>Left Hitbox</Button>
      </Hitbox>
      <div className="text-sm text-muted-foreground mb-2">Right</div>
      <Hitbox position="right" debug>
        <Button>Right Hitbox</Button>
      </Hitbox>
    </div>
  ),
};

/**
 * Hitbox with debug mode enabled to visualize the hit area.
 */
export const Debug: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        Debug mode shows the extended hit area with a red dashed border.
      </div>
      <Hitbox debug>
        <Button>Button with Debug Hitbox</Button>
      </Hitbox>
    </div>
  ),
};

/**
 * Hitbox with custom size using CSS variable.
 */
export const CustomSize: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        Custom size using CSS variable (20px).
      </div>
      <Hitbox size="20px" debug>
        <Button>Custom Size Hitbox</Button>
      </Hitbox>
    </div>
  ),
};

/**
 * Hitbox with rounded corners.
 */
export const WithRadius: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Hitbox radius="md" debug>
        <Button>Rounded Hitbox</Button>
      </Hitbox>
    </div>
  ),
};
