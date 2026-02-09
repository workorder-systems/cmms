import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from './button-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Download, FileText, MoreVertical, Save, Share2, Trash2 } from 'lucide-react';

const meta = {
  title: 'Patterns/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'ButtonGroup is a container component that groups related buttons together, removing borders between adjacent buttons for a seamless appearance. Supports both horizontal and vertical orientations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Orientation of the button group',
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic horizontal button group with three buttons.
 */
export const Horizontal: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">First</Button>
      <Button variant="outline">Second</Button>
      <Button variant="outline">Third</Button>
    </ButtonGroup>
  ),
};

/**
 * Vertical button group for stacked layouts.
 */
export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">First</Button>
      <Button variant="outline">Second</Button>
      <Button variant="outline">Third</Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with different button variants.
 */
export const MixedVariants: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="default">Primary</Button>
      <Button variant="outline">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with icons.
 */
export const WithIcons: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline">
        <Download className="size-4" />
        Download
      </Button>
      <Button variant="outline">
        <Share2 className="size-4" />
        Share
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with icon-only buttons.
 */
export const IconOnly: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Save className="size-4" />
      </Button>
      <Button variant="outline" size="icon">
        <Download className="size-4" />
      </Button>
      <Button variant="outline" size="icon">
        <Share2 className="size-4" />
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with separators to visually group related actions.
 */
export const WithSeparators: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline">
        <Download className="size-4" />
        Download
      </Button>
      <ButtonGroupSeparator />
      <Button variant="outline">
        <Share2 className="size-4" />
        Share
      </Button>
      <Button variant="outline" size="icon">
        <MoreVertical className="size-4" />
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Button group with text label using ButtonGroupText.
 */
export const WithTextLabel: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>Actions</ButtonGroupText>
      <ButtonGroupSeparator />
      <Button variant="outline">
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline">
        <Download className="size-4" />
        Download
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Button group combined with a Select component.
 */
export const WithSelect: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">
        <FileText className="size-4" />
        Export
      </Button>
      <Select defaultValue="pdf">
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="csv">CSV</SelectItem>
          <SelectItem value="xlsx">Excel</SelectItem>
        </SelectContent>
      </Select>
    </ButtonGroup>
  ),
};

/**
 * Button group with destructive action separated.
 */
export const WithDestructiveAction: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline">
        <Share2 className="size-4" />
        Share
      </Button>
      <ButtonGroupSeparator />
      <Button variant="destructive">
        <Trash2 className="size-4" />
        Delete
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Small size button group.
 */
export const Small: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="sm">
        <Save className="size-3" />
        Save
      </Button>
      <Button variant="outline" size="sm">
        <Download className="size-3" />
        Download
      </Button>
      <Button variant="outline" size="sm">
        <Share2 className="size-3" />
        Share
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Large size button group.
 */
export const Large: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="lg">
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline" size="lg">
        <Download className="size-4" />
        Download
      </Button>
      <Button variant="outline" size="lg">
        <Share2 className="size-4" />
        Share
      </Button>
    </ButtonGroup>
  ),
};

/**
 * Complete example with all features: text label, separators, buttons, and select.
 */
export const Complete: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Document Actions</h3>
        <ButtonGroup>
          <ButtonGroupText>File</ButtonGroupText>
          <ButtonGroupSeparator />
          <Button variant="outline">
            <Save className="size-4" />
            Save
          </Button>
          <Button variant="outline">
            <Download className="size-4" />
            Download
          </Button>
          <ButtonGroupSeparator />
          <Button variant="outline">
            <Share2 className="size-4" />
            Share
          </Button>
          <Select defaultValue="pdf">
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
            </SelectContent>
          </Select>
        </ButtonGroup>
      </div>
    </div>
  ),
};
