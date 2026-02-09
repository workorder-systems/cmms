import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
  MoreHorizontal,
  User,
  Home,
  Settings,
  Bell,
  Mail,
  Download,
  Trash2,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

const meta = {
  title: 'Patterns/ListItem',
  component: Item,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'muted'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Item component provides a structured way to display list items with media,
 * content, and actions. It's useful for building lists, menus, and navigation.
 */
export const Default: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemMedia with variant="icon" to display an icon.
 */
export const Icon: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>User Profile</ItemTitle>
          <ItemDescription>Manage your account settings</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemMedia with Avatar component to display an avatar.
 * The Avatar is placed inside ItemMedia with default variant.
 */
export const WithAvatar: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemMedia with variant="image" to display an image.
 */
export const Image: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia variant="image">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
            alt="Profile"
            className="rounded-sm"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemGroup to group related items together.
 */
export const Group: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia variant="icon">
          <Home className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Dashboard</ItemTitle>
          <ItemDescription>Overview of your account and activity</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Settings className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Settings</ItemTitle>
          <ItemDescription>Manage your preferences</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Bell className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Notifications</ItemTitle>
          <ItemDescription>View and manage notifications</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemHeader to add a header above the item content.
 */
export const Header: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemHeader>
          <span className="text-xs font-medium text-muted-foreground">
            Recent Activity
          </span>
        </ItemHeader>
        <ItemMedia variant="icon">
          <Mail className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>New message received</ItemTitle>
          <ItemDescription>You have a new message from John</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Bell className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Task completed</ItemTitle>
          <ItemDescription>Your task has been marked as complete</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemFooter to add a footer below the item content.
 */
export const Footer: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia variant="icon">
          <Download className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Download Complete</ItemTitle>
          <ItemDescription>Your file has been downloaded successfully</ItemDescription>
        </ItemContent>
        <ItemFooter>
          <span className="text-xs text-muted-foreground">2 minutes ago</span>
        </ItemFooter>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use the asChild prop to render the item as a link.
 * The hover and focus states will be applied to the anchor element.
 */
export const Link: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item asChild>
        <a href="#dashboard">
          <ItemMedia variant="icon">
            <Home className="h-4 w-4" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Dashboard</ItemTitle>
            <ItemDescription>Overview of your account and activity.</ItemDescription>
          </ItemContent>
        </a>
      </Item>
      <ItemSeparator />
      <Item asChild>
        <a href="#settings">
          <ItemMedia variant="icon">
            <Settings className="h-4 w-4" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Settings</ItemTitle>
            <ItemDescription>Manage your account settings and preferences.</ItemDescription>
          </ItemContent>
        </a>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use ItemActions to add action buttons or other interactive elements.
 */
export const WithActions: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use variants to change the visual style of the item.
 */
export const Variants: Story = {
  render: () => (
    <ItemGroup className="w-[350px] space-y-4">
      <Item variant="default">
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default</ItemTitle>
          <ItemDescription>Transparent background</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Outline</ItemTitle>
          <ItemDescription>With border</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Muted</ItemTitle>
          <ItemDescription>With muted background</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Use the size prop to change the size of the item.
 */
export const Sizes: Story = {
  render: () => (
    <ItemGroup className="w-[350px] space-y-4">
      <Item size="default">
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default Size</ItemTitle>
          <ItemDescription>Standard padding and spacing</ItemDescription>
        </ItemContent>
      </Item>
      <Item size="sm">
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Small Size</ItemTitle>
          <ItemDescription>Compact padding and spacing</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Example with dropdown menu in actions.
 */
export const Dropdown: Story = {
  render: () => (
    <ItemGroup className="w-[350px]">
      <Item>
        <ItemMedia>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer</ItemDescription>
        </ItemContent>
        <ItemActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Complex example with multiple items, separators, and various media types.
 */
export const Complex: Story = {
  render: () => (
    <ItemGroup className="w-[400px]">
      <Item>
        <ItemHeader>
          <span className="text-xs font-medium text-muted-foreground">
            Team Members
          </span>
        </ItemHeader>
        <ItemMedia>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>John Doe</ItemTitle>
          <ItemDescription>Software Engineer • Active</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Message
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <User className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Jane Smith</ItemTitle>
          <ItemDescription>Product Designer • Away</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            Message
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="muted">
        <ItemMedia variant="image">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
            alt="Profile"
            className="rounded-sm"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Bob Johnson</ItemTitle>
          <ItemDescription>Marketing Manager • Offline</ItemDescription>
        </ItemContent>
        <ItemFooter>
          <span className="text-xs text-muted-foreground">Last seen 2 hours ago</span>
        </ItemFooter>
      </Item>
    </ItemGroup>
  ),
};
