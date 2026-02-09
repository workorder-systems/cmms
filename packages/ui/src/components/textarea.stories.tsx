import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
    rows: {
      control: 'number',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Textarea component is a multi-line text input field.
 * It automatically adjusts its height based on content and supports proper focus states.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithRows: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 5,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is a pre-filled textarea with some content that demonstrates how it looks with existing text.',
  },
};
