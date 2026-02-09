import type { Meta, StoryObj } from '@storybook/react';
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from './responsive-dialog';
import { Button } from './button';

const meta = {
  title: 'Overlay/ResponsiveDialog',
  component: ResponsiveDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ResponsiveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The ResponsiveDialog component automatically switches between a Dialog (desktop) and Drawer (mobile) based on screen size.
 * On screens smaller than the breakpoint (default 768px), it renders as a drawer that slides up from the bottom.
 * On larger screens, it renders as a centered dialog modal.
 */
export const Default: Story = {
  render: () => (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button>Open Responsive Dialog</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Are you absolutely sure?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
};

/**
 * Use the responsive dialog to confirm destructive actions like deleting items.
 * The dialog will automatically adapt to the screen size.
 */
export const ConfirmationDialog: Story = {
  render: () => (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Delete Account</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Are you sure you want to delete your account? This action cannot be undone.
            All your data will be permanently removed.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </ResponsiveDialogTrigger>
          <Button variant="destructive">Delete Account</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
};

/**
 * Each component exposes a `data-variant` attribute that can be used to apply different styles
 * based on whether the dialog or drawer is rendered.
 * Use `data-[variant=drawer]` for mobile-specific styles and `data-[variant=dialog]` for desktop styles.
 */
export const VariantStyling: Story = {
  render: () => (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline">Open with Variant Styling</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="data-[variant=drawer]:pb-8 data-[variant=dialog]:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Variant Styling Example</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This dialog uses variant-specific styling. On mobile (drawer), it has extra bottom padding.
            On desktop (dialog), it has a maximum width constraint.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Resize your browser window to see the component switch between dialog and drawer modes.
          </p>
        </div>
        <ResponsiveDialogFooter className="data-[variant=drawer]:flex-col data-[variant=dialog]:flex-row">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
};

/**
 * A simple responsive dialog with just a title and description, no footer.
 */
export const Simple: Story = {
  render: () => (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline">Open Simple Dialog</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Simple Responsive Dialog</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A simple dialog with just a title and description. It will render as a drawer on mobile
            and as a dialog on desktop.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
};

/**
 * Custom breakpoint example. The default breakpoint is 768px, but you can customize it.
 * This example uses a breakpoint of 1024px, so it will render as a drawer on screens smaller than 1024px.
 */
export const CustomBreakpoint: Story = {
  render: () => (
    <ResponsiveDialog breakpoint={1024}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline">Open with Custom Breakpoint</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Custom Breakpoint</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This dialog uses a custom breakpoint of 1024px. It will render as a drawer on screens
            smaller than 1024px and as a dialog on larger screens.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
};
