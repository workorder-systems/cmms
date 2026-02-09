import type { Meta, StoryObj } from '@storybook/react';
import PartitionBar, {
  PartitionBarSegment,
  PartitionBarSegmentTitle,
  PartitionBarSegmentValue,
} from './partition-bar';

const meta = {
  title: 'Data/PartitionBar',
  component: PartitionBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof PartitionBar>;

export default meta;
type Story = StoryObj<typeof PartitionBar>;

/**
 * The PartitionBar component displays proportional segments in a horizontal bar.
 * It's useful for showing distributions, percentages, or proportional data.
 */
export const Default: Story = {
  render: () => (
    <div className="w-[500px]">
      <PartitionBar>
        <PartitionBarSegment num={40} variant="default">
          <PartitionBarSegmentTitle>Desktop</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>40%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={35} variant="secondary">
          <PartitionBarSegmentTitle>Mobile</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>35%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={25} variant="muted">
          <PartitionBarSegmentTitle>Tablet</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
      </PartitionBar>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-[500px] space-y-6">
      <div>
        <p className="text-sm mb-2">Small</p>
        <PartitionBar size="sm">
          <PartitionBarSegment num={50} variant="default">
            <PartitionBarSegmentTitle>Segment 1</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} variant="secondary">
            <PartitionBarSegmentTitle>Segment 2</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
      <div>
        <p className="text-sm mb-2">Medium</p>
        <PartitionBar size="md">
          <PartitionBarSegment num={50} variant="default">
            <PartitionBarSegmentTitle>Segment 1</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} variant="secondary">
            <PartitionBarSegmentTitle>Segment 2</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
      <div>
        <p className="text-sm mb-2">Large</p>
        <PartitionBar size="lg">
          <PartitionBarSegment num={50} variant="default">
            <PartitionBarSegmentTitle>Segment 1</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} variant="secondary">
            <PartitionBarSegmentTitle>Segment 2</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="w-[500px]">
      <PartitionBar>
        <PartitionBarSegment num={25} variant="default">
          <PartitionBarSegmentTitle>Default</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={25} variant="secondary">
          <PartitionBarSegmentTitle>Secondary</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={25} variant="destructive">
          <PartitionBarSegmentTitle>Destructive</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={25} variant="muted">
          <PartitionBarSegmentTitle>Muted</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
      </PartitionBar>
    </div>
  ),
};

export const Alignment: Story = {
  render: () => (
    <div className="w-[500px] space-y-6">
      <div>
        <p className="text-sm mb-2">Left Aligned</p>
        <PartitionBar>
          <PartitionBarSegment num={50} alignment="left">
            <PartitionBarSegmentTitle>Left</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} alignment="left">
            <PartitionBarSegmentTitle>Left</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
      <div>
        <p className="text-sm mb-2">Center Aligned</p>
        <PartitionBar>
          <PartitionBarSegment num={50} alignment="center">
            <PartitionBarSegmentTitle>Center</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} alignment="center">
            <PartitionBarSegmentTitle>Center</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
      <div>
        <p className="text-sm mb-2">Right Aligned</p>
        <PartitionBar>
          <PartitionBarSegment num={50} alignment="right">
            <PartitionBarSegmentTitle>Right</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
          <PartitionBarSegment num={50} alignment="right">
            <PartitionBarSegmentTitle>Right</PartitionBarSegmentTitle>
            <PartitionBarSegmentValue>50%</PartitionBarSegmentValue>
          </PartitionBarSegment>
        </PartitionBar>
      </div>
    </div>
  ),
};

export const MultipleSegments: Story = {
  render: () => (
    <div className="w-[500px]">
      <PartitionBar>
        <PartitionBarSegment num={30} variant="default">
          <PartitionBarSegmentTitle>Chrome</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>30%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={25} variant="secondary">
          <PartitionBarSegmentTitle>Safari</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>25%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={20} variant="muted">
          <PartitionBarSegmentTitle>Firefox</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>20%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={15} variant="outline">
          <PartitionBarSegmentTitle>Edge</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>15%</PartitionBarSegmentValue>
        </PartitionBarSegment>
        <PartitionBarSegment num={10} variant="destructive">
          <PartitionBarSegmentTitle>Other</PartitionBarSegmentTitle>
          <PartitionBarSegmentValue>10%</PartitionBarSegmentValue>
        </PartitionBarSegment>
      </PartitionBar>
    </div>
  ),
};
