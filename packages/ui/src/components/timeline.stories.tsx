import type { Meta, StoryObj } from '@storybook/react';
import {
  Timeline,
  TimelineItem,
  TimelineItemDate,
  TimelineItemTitle,
  TimelineItemDescription,
} from './timeline';

const meta = {
  title: 'Data/Timeline',
  component: Timeline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Timeline component displays a sequence of events in chronological order.
 * It supports both horizontal and vertical orientations with alternating layouts.
 */
export const Horizontal: Story = {
  render: () => (
    <div className="w-[800px]">
      <Timeline orientation="horizontal" alternating>
        <TimelineItem>
          <TimelineItemDate>Jan 2024</TimelineItemDate>
          <TimelineItemTitle>Project Started</TimelineItemTitle>
          <TimelineItemDescription>
            Initial planning and setup of the project infrastructure.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Feb 2024</TimelineItemDate>
          <TimelineItemTitle>First Release</TimelineItemTitle>
          <TimelineItemDescription>
            Launched the first version with core features.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Mar 2024</TimelineItemDate>
          <TimelineItemTitle>Major Update</TimelineItemTitle>
          <TimelineItemDescription>
            Added new features and improved performance.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Apr 2024</TimelineItemDate>
          <TimelineItemTitle>Version 2.0</TimelineItemTitle>
          <TimelineItemDescription>
            Complete redesign with enhanced user experience.
          </TimelineItemDescription>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="w-[400px]">
      <Timeline orientation="vertical" alternating>
        <TimelineItem>
          <TimelineItemDate>Jan 2024</TimelineItemDate>
          <TimelineItemTitle>Project Started</TimelineItemTitle>
          <TimelineItemDescription>
            Initial planning and setup of the project infrastructure.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Feb 2024</TimelineItemDate>
          <TimelineItemTitle>First Release</TimelineItemTitle>
          <TimelineItemDescription>
            Launched the first version with core features.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Mar 2024</TimelineItemDate>
          <TimelineItemTitle>Major Update</TimelineItemTitle>
          <TimelineItemDescription>
            Added new features and improved performance.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Apr 2024</TimelineItemDate>
          <TimelineItemTitle>Version 2.0</TimelineItemTitle>
          <TimelineItemDescription>
            Complete redesign with enhanced user experience.
          </TimelineItemDescription>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};

export const NoCards: Story = {
  render: () => (
    <div className="w-[400px]">
      <Timeline orientation="vertical" noCards>
        <TimelineItem>
          <TimelineItemDate>Jan 2024</TimelineItemDate>
          <TimelineItemTitle>Project Started</TimelineItemTitle>
          <TimelineItemDescription>
            Initial planning and setup.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Feb 2024</TimelineItemDate>
          <TimelineItemTitle>First Release</TimelineItemTitle>
          <TimelineItemDescription>
            Launched the first version.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem>
          <TimelineItemDate>Mar 2024</TimelineItemDate>
          <TimelineItemTitle>Major Update</TimelineItemTitle>
          <TimelineItemDescription>
            Added new features.
          </TimelineItemDescription>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};

export const Hollow: Story = {
  render: () => (
    <div className="w-[400px]">
      <Timeline orientation="vertical">
        <TimelineItem hollow>
          <TimelineItemDate>Jan 2024</TimelineItemDate>
          <TimelineItemTitle>Project Started</TimelineItemTitle>
          <TimelineItemDescription>
            Initial planning and setup.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem hollow>
          <TimelineItemDate>Feb 2024</TimelineItemDate>
          <TimelineItemTitle>First Release</TimelineItemTitle>
          <TimelineItemDescription>
            Launched the first version.
          </TimelineItemDescription>
        </TimelineItem>
        <TimelineItem hollow>
          <TimelineItemDate>Mar 2024</TimelineItemDate>
          <TimelineItemTitle>Major Update</TimelineItemTitle>
          <TimelineItemDescription>
            Added new features.
          </TimelineItemDescription>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="w-[400px]">
      <Timeline orientation="vertical">
        <TimelineItem variant="default">
          <TimelineItemDate>Default</TimelineItemDate>
          <TimelineItemTitle>Default Variant</TimelineItemTitle>
        </TimelineItem>
        <TimelineItem variant="secondary">
          <TimelineItemDate>Secondary</TimelineItemDate>
          <TimelineItemTitle>Secondary Variant</TimelineItemTitle>
        </TimelineItem>
        <TimelineItem variant="destructive">
          <TimelineItemDate>Destructive</TimelineItemDate>
          <TimelineItemTitle>Destructive Variant</TimelineItemTitle>
        </TimelineItem>
        <TimelineItem variant="outline">
          <TimelineItemDate>Outline</TimelineItemDate>
          <TimelineItemTitle>Outline Variant</TimelineItemTitle>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};
