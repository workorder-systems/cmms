import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';

const meta = {
  title: 'Forms/Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Slider component allows users to select a value or range of values by dragging.
 * It's useful for numeric inputs, volume controls, and other continuous value selections.
 */
export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider defaultValue={[50]} max={100} />
    </div>
  ),
};

export const WithSteps: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>
        <p className="text-sm mb-2">Volume: 50%</p>
        <Slider defaultValue={[50]} min={0} max={100} step={1} />
      </div>
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider defaultValue={[20, 80]} min={0} max={100} step={1} />
    </div>
  ),
};

export const CustomRange: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>
        <p className="text-sm mb-2">Price Range: $0 - $1000</p>
        <Slider defaultValue={[250, 750]} min={0} max={1000} step={10} />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider defaultValue={[50]} min={0} max={100} disabled />
    </div>
  ),
};
