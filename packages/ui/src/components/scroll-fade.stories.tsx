import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ScrollFade from './scroll-fade';

const meta = {
  title: 'Layout/ScrollFade',
  component: ScrollFade as React.ComponentType<React.ComponentProps<typeof ScrollFade>>,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    axis: {
      control: 'select',
      options: ['horizontal', 'vertical', 'both'],
    },
    hideScrollbar: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ScrollFade>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The ScrollFade component adds fade gradients to scrollable content,
 * indicating when there's more content to scroll in a direction.
 */
export const Horizontal: Story = {
  render: () => (
    <div className="w-[400px]">
      <ScrollFade axis="horizontal" hideScrollbar>
        <div className="flex gap-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-32 h-32 bg-muted rounded-lg flex items-center justify-center"
            >
              Item {i + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="h-[300px] w-[300px]">
      <ScrollFade axis="vertical" hideScrollbar>
        <div className="space-y-4">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="h-24 bg-muted rounded-lg flex items-center justify-center"
            >
              Item {i + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  ),
};

export const Both: Story = {
  render: () => (
    <div className="h-[300px] w-[400px]">
      <ScrollFade axis="both" hideScrollbar>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: 100 }, (_, i) => (
            <div
              key={i}
              className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-xs"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  ),
};

export const WithScrollbar: Story = {
  render: () => (
    <div className="w-[400px]">
      <ScrollFade axis="horizontal" hideScrollbar={false}>
        <div className="flex gap-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-32 h-32 bg-muted rounded-lg flex items-center justify-center"
            >
              Item {i + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <div className="w-[400px]">
      <ScrollFade axis="horizontal">
        <div className="flex gap-2">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-24 h-24 bg-primary/10 rounded-lg flex items-center justify-center text-sm"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  ),
};
