import type { Meta, StoryObj } from '@storybook/react';
import { SquigglyArrow } from './squiggly-arrow';

const meta = {
  title: 'Primitives/SquigglyArrow',
  component: SquigglyArrow,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'SquigglyArrow is a decorative arrow component with hand-drawn style. Perfect for indicating direction, flow, or pointing to elements in tours and guides.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['right', 'left', 'up', 'down'],
      description: 'Direction the arrow points',
    },
    variant: {
      control: 'select',
      options: ['wavy', 'bouncy', 'smooth'],
      description: 'Style variant of the arrow',
    },
    width: {
      control: 'number',
      description: 'Width of the arrow',
    },
    height: {
      control: 'number',
      description: 'Height of the arrow',
    },
    strokeWidth: {
      control: 'number',
      description: 'Stroke width of the arrow',
    },
  },
} satisfies Meta<typeof SquigglyArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default wavy arrow pointing right.
 */
export const Default: Story = {
  args: {
    direction: 'right',
    variant: 'wavy',
  },
};

/**
 * All three variants: wavy, bouncy, and smooth.
 */
export const Variants: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Wavy</h3>
        <SquigglyArrow variant="wavy" direction="right" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Bouncy</h3>
        <SquigglyArrow variant="bouncy" direction="right" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Smooth</h3>
        <SquigglyArrow variant="smooth" direction="right" />
      </div>
    </div>
  ),
};

/**
 * All four directions: right, left, up, and down.
 */
export const Directions: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Right</h3>
        <SquigglyArrow direction="right" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Left</h3>
        <SquigglyArrow direction="left" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Up</h3>
        <SquigglyArrow direction="up" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Down</h3>
        <SquigglyArrow direction="down" />
      </div>
    </div>
  ),
};

/**
 * Different sizes of arrows.
 */
export const Sizes: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Small</h3>
        <SquigglyArrow width={100} height={50} strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Default</h3>
        <SquigglyArrow width={200} height={100} strokeWidth={2.5} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Large</h3>
        <SquigglyArrow width={300} height={150} strokeWidth={3} />
      </div>
    </div>
  ),
};

/**
 * Different stroke widths.
 */
export const StrokeWidths: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Thin (1.5)</h3>
        <SquigglyArrow strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Default (2.5)</h3>
        <SquigglyArrow strokeWidth={2.5} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Thick (4)</h3>
        <SquigglyArrow strokeWidth={4} />
      </div>
    </div>
  ),
};

/**
 * Arrows with custom colors using className.
 */
export const CustomColors: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Primary</h3>
        <SquigglyArrow className="text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Destructive</h3>
        <SquigglyArrow className="text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Muted</h3>
        <SquigglyArrow className="text-muted-foreground" />
      </div>
    </div>
  ),
};

/**
 * All variants in all directions for comprehensive overview.
 */
export const AllCombinations: Story = {
  render: () => (
    <div className="w-full space-y-8">
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Wavy Variant</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Right</p>
            <SquigglyArrow variant="wavy" direction="right" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Left</p>
            <SquigglyArrow variant="wavy" direction="left" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Up</p>
            <SquigglyArrow variant="wavy" direction="up" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Down</p>
            <SquigglyArrow variant="wavy" direction="down" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Bouncy Variant</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Right</p>
            <SquigglyArrow variant="bouncy" direction="right" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Left</p>
            <SquigglyArrow variant="bouncy" direction="left" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Up</p>
            <SquigglyArrow variant="bouncy" direction="up" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Down</p>
            <SquigglyArrow variant="bouncy" direction="down" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Smooth Variant</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Right</p>
            <SquigglyArrow variant="smooth" direction="right" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Left</p>
            <SquigglyArrow variant="smooth" direction="left" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Up</p>
            <SquigglyArrow variant="smooth" direction="up" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Down</p>
            <SquigglyArrow variant="smooth" direction="down" />
          </div>
        </div>
      </div>
    </div>
  ),
};
