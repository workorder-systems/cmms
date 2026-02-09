import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { ToolbarExpandable, type DynamicStep } from './toolbar-expandable';
import { Button } from './button';
import { Input } from './input';
import { CheckCircle, Settings, User, Mail, Bell } from 'lucide-react';

const meta = {
  title: 'Patterns/ToolbarExpandable',
  component: ToolbarExpandable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToolbarExpandable>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleSteps: DynamicStep[] = [
  {
    id: 'step-1',
    title: 'Welcome',
    description: 'Get started with our platform',
    icon: CheckCircle,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Welcome to the platform! This is the first step of your journey.
        </p>
        <Button>Get Started</Button>
      </div>
    ),
  },
  {
    id: 'step-2',
    title: 'Profile Setup',
    description: 'Configure your profile settings',
    icon: User,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input placeholder="Enter your name" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="Enter your email" />
        </div>
        <Button>Save Profile</Button>
      </div>
    ),
  },
  {
    id: 'step-3',
    title: 'Notifications',
    description: 'Set up your notification preferences',
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose how you want to receive notifications.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Email notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Push notifications</span>
          </label>
        </div>
      </div>
    ),
  },
  {
    id: 'step-4',
    title: 'Settings',
    description: 'Customize your experience',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure your application settings.
        </p>
        <Button>Open Settings</Button>
      </div>
    ),
  },
];

/**
 * The Toolbar Expandable component provides an expandable toolbar with navigation steps.
 * Click on a step to expand and view its content with smooth animations.
 */
export const Default: Story = {
  render: () => <ToolbarExpandable steps={exampleSteps} />,
};

export const WithBadge: Story = {
  render: () => (
    <ToolbarExpandable steps={exampleSteps} badgeText="New Features" />
  ),
};

export const Controlled: Story = {
  render: () => {
    const [activeStep, setActiveStep] = React.useState<string | null>(null);
    const [expanded, setExpanded] = React.useState(false);

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActiveStep('step-1');
              setExpanded(true);
            }}
          >
            Go to Step 1
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActiveStep(null);
              setExpanded(false);
            }}
          >
            Close
          </Button>
        </div>
        <ToolbarExpandable
          steps={exampleSteps}
          activeStep={activeStep}
          onActiveStepChange={setActiveStep}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
    );
  },
};
