import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Tabs component organizes content into multiple panels that can be switched between.
 * It supports horizontal and vertical orientations, and different visual variants.
 */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">Make changes to your account here.</p>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">Change your password here.</p>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">Manage your settings here.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">Account settings content.</p>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">Password settings content.</p>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="mt-4 p-4 border rounded-md">
          <p className="text-sm">General settings content.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="w-[500px] flex gap-4">
      <TabsList variant="line" className="flex-col h-fit">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <div className="flex-1">
        <TabsContent value="account">
          <div className="p-4 border rounded-md">
            <p className="text-sm">Account settings content.</p>
          </div>
        </TabsContent>
        <TabsContent value="password">
          <div className="p-4 border rounded-md">
            <p className="text-sm">Password settings content.</p>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="p-4 border rounded-md">
            <p className="text-sm">General settings content.</p>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  ),
};
