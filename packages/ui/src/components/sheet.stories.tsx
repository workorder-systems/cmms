import type { Meta, StoryObj } from '@storybook/react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './sheet';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'Overlay/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Sheet component displays a side panel that slides in from the edge of the screen.
 * It extends the Dialog component to display content that complements the main content of the screen.
 * It's useful for mobile navigation, filters, or additional content.
 */
export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Are you absolutely sure?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="Pedro Duarte" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" defaultValue="@peduarte" />
          </div>
        </div>
        <SheetFooter>
          <Button>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * Use the `side` prop on `SheetContent` to set the edge of the screen where the sheet appears.
 * Values are `top`, `right`, `bottom`, or `left`. The default is `right`.
 */
export const Side: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Right</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
            <SheetDescription>
              Make changes to your profile here. Click save when you're done.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="Pedro Duarte" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="@peduarte" />
            </div>
          </div>
          <SheetFooter>
            <Button>Save changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Left</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Browse through the menu items.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <nav className="space-y-2">
              <a href="#" className="block px-4 py-2 hover:bg-accent rounded-md">
                Home
              </a>
              <a href="#" className="block px-4 py-2 hover:bg-accent rounded-md">
                About
              </a>
              <a href="#" className="block px-4 py-2 hover:bg-accent rounded-md">
                Contact
              </a>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Top</Button>
        </SheetTrigger>
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>You have 3 new notifications.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <div className="space-y-2">
              <div className="p-3 border rounded-md">New message from John</div>
              <div className="p-3 border rounded-md">Task completed</div>
              <div className="p-3 border rounded-md">New follower</div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Bottom</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Share</SheetTitle>
            <SheetDescription>Share this content with others.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <div className="flex gap-2">
              <Button variant="outline">Copy Link</Button>
              <Button variant="outline">Email</Button>
              <Button variant="outline">Twitter</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
};

/**
 * Use `showCloseButton={false}` on `SheetContent` to hide the close button.
 * You can still close the sheet using the `SheetClose` component or by clicking outside.
 */
export const NoCloseButton: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Custom Sheet</SheetTitle>
          <SheetDescription>
            This sheet doesn't have a close button in the header. Use the button below to close it.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <p className="text-sm text-muted-foreground">
            You can close this sheet using the button below or by clicking outside.
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * The Sheet component supports RTL (Right-to-Left) layouts.
 * When used in an RTL context, the sheet will automatically adjust its positioning and animations.
 */
export const RTL: Story = {
  render: () => (
    <div dir="rtl">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">פתח</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>האם אתה בטוח לחלוטין?</SheetTitle>
            <SheetDescription>
              פעולה זו לא ניתנת לביטול. זה ימחק לצמיתות את החשבון שלך
              ויסיר את הנתונים שלך מהשרתים שלנו.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="rtl-name">שם</Label>
              <Input id="rtl-name" defaultValue="פדרו דוארטה" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rtl-username">שם משתמש</Label>
              <Input id="rtl-username" defaultValue="@peduarte" />
            </div>
          </div>
          <SheetFooter>
            <Button>שמור שינויים</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  ),
};
