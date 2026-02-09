import type { Meta, StoryObj } from '@storybook/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from './popover';
import { Button } from './button';

const meta = {
  title: 'Overlay/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Popover component displays a floating panel that appears when triggered.
 * It's useful for displaying additional content or actions.
 */
export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="width" className="text-sm">Width</label>
            <input
              id="width"
              defaultValue="100%"
              className="h-8 px-2 border rounded"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="height" className="text-sm">Height</label>
            <input
              id="height"
              defaultValue="25px"
              className="h-8 px-2 border rounded"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const Simple: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Are you absolutely sure?</PopoverTitle>
          <PopoverDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};
