import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta = {
  title: 'Feedback/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Progress component displays the completion status of a task or process.
 * It shows a visual indicator of progress from 0 to 100 percent.
 */
export const Default: Story = {
  args: {
    value: 33,
  },
};

export const Half: Story = {
  args: {
    value: 50,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
};

export const Examples: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div>
        <p className="text-sm mb-2">Uploading files...</p>
        <Progress value={33} />
      </div>
      <div>
        <p className="text-sm mb-2">Processing data...</p>
        <Progress value={66} />
      </div>
      <div>
        <p className="text-sm mb-2">Almost done...</p>
        <Progress value={90} />
      </div>
    </div>
  ),
};
