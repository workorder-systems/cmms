import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './spinner';
import { Button } from './button';

const meta = {
  title: 'Primitives/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Spinner component displays a loading indicator.
 * It's used to show that an operation is in progress.
 */
export const Default: Story = {
  render: () => <Spinner />,
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
      <Spinner className="size-12" />
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner className="mr-2" />
      Loading...
    </Button>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner />
      <span className="text-sm">Loading data...</span>
    </div>
  ),
};

export const Centered: Story = {
  render: () => (
    <div className="flex items-center justify-center h-32">
      <Spinner className="size-8" />
    </div>
  ),
};
