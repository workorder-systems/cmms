import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import StatusIndicator from './status-indicator';

const meta = {
  title: 'Feedback/StatusIndicator',
  component: StatusIndicator as React.ComponentType<React.ComponentProps<typeof StatusIndicator>>,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['active', 'down', 'fixing', 'idle'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The StatusIndicator component displays the current status of a system or service.
 * It shows a colored dot with optional animation and label.
 */
export const Active: Story = {
  args: {
    state: 'active',
    label: 'Online',
  },
};

export const Down: Story = {
  args: {
    state: 'down',
    label: 'Offline',
  },
};

export const Fixing: Story = {
  args: {
    state: 'fixing',
    label: 'Maintenance',
  },
};

export const Idle: Story = {
  args: {
    state: 'idle',
    label: 'Standby',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusIndicator state="active" size="sm" label="Small" />
      <StatusIndicator state="active" size="md" label="Medium" />
      <StatusIndicator state="active" size="lg" label="Large" />
    </div>
  ),
};

export const WithoutLabel: Story = {
  render: () => (
    <div className="flex gap-4">
      <StatusIndicator state="active" />
      <StatusIndicator state="down" />
      <StatusIndicator state="fixing" />
      <StatusIndicator state="idle" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusIndicator state="active" label="System Active" />
      <StatusIndicator state="down" label="System Down" />
      <StatusIndicator state="fixing" label="Under Maintenance" />
      <StatusIndicator state="idle" label="System Idle" />
    </div>
  ),
};
