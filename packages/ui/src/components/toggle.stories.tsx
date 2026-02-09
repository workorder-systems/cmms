import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './toggle';
import { BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react';

const meta = {
  title: 'Forms/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Toggle component is a two-state button that can be toggled on or off.
 * It's commonly used for formatting controls and toggleable options.
 */
export const Default: Story = {
  render: () => (
    <Toggle aria-label="Toggle bold">
      <BoldIcon />
    </Toggle>
  ),
};

export const Outline: Story = {
  render: () => (
    <Toggle variant="outline" aria-label="Toggle italic">
      <ItalicIcon />
    </Toggle>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Small toggle">
        <BoldIcon />
      </Toggle>
      <Toggle size="default" aria-label="Default toggle">
        <BoldIcon />
      </Toggle>
      <Toggle size="lg" aria-label="Large toggle">
        <BoldIcon />
      </Toggle>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Toggle aria-label="Toggle bold">
        <BoldIcon />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <ItalicIcon />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <UnderlineIcon />
      </Toggle>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle>
      <BoldIcon />
      Bold
    </Toggle>
  ),
};
