import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from './native-select';

const meta = {
  title: 'Forms/NativeSelect',
  component: NativeSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic native select dropdown.
 */
export const Default: Story = {
  render: () => (
    <NativeSelect>
      <NativeSelectOption value="">Select a framework</NativeSelectOption>
      <NativeSelectOption value="react">React</NativeSelectOption>
      <NativeSelectOption value="vue">Vue</NativeSelectOption>
      <NativeSelectOption value="angular">Angular</NativeSelectOption>
      <NativeSelectOption value="svelte">Svelte</NativeSelectOption>
    </NativeSelect>
  ),
};

/**
 * Native select with optgroups.
 */
export const WithOptGroups: Story = {
  render: () => (
    <NativeSelect>
      <NativeSelectOption value="">Select a category</NativeSelectOption>
      <NativeSelectOptGroup label="Frontend">
        <NativeSelectOption value="react">React</NativeSelectOption>
        <NativeSelectOption value="vue">Vue</NativeSelectOption>
        <NativeSelectOption value="angular">Angular</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Backend">
        <NativeSelectOption value="node">Node.js</NativeSelectOption>
        <NativeSelectOption value="python">Python</NativeSelectOption>
        <NativeSelectOption value="go">Go</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
};

/**
 * Native select with different sizes.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <NativeSelect size="sm">
        <NativeSelectOption value="">Small</NativeSelectOption>
        <NativeSelectOption value="1">Option 1</NativeSelectOption>
        <NativeSelectOption value="2">Option 2</NativeSelectOption>
      </NativeSelect>
      <NativeSelect size="default">
        <NativeSelectOption value="">Default</NativeSelectOption>
        <NativeSelectOption value="1">Option 1</NativeSelectOption>
        <NativeSelectOption value="2">Option 2</NativeSelectOption>
      </NativeSelect>
    </div>
  ),
};

/**
 * Native select with disabled state.
 */
export const Disabled: Story = {
  render: () => (
    <NativeSelect disabled>
      <NativeSelectOption value="">Disabled select</NativeSelectOption>
      <NativeSelectOption value="1">Option 1</NativeSelectOption>
      <NativeSelectOption value="2">Option 2</NativeSelectOption>
    </NativeSelect>
  ),
};
