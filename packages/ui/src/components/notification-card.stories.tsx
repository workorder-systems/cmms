import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NotificationCard, type NotificationCardProps } from './notification-card';

const meta = {
  title: 'Patterns/NotificationCard',
  component: NotificationCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A notification card component with support for different statuses, actions, and timestamps.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['unread', 'read', 'archived'],
      description: 'Notification status',
    },
  },
} satisfies Meta<typeof NotificationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A basic unread notification with title and body.
 */
export const Basic: Story = {
  render: (args) => (
    <div className="w-full">
      <NotificationCard {...args} />
    </div>
  ),
  args: {
    id: '1',
    title: 'New message received',
    body: 'You have a new message from John Doe. Click to view.',
    status: 'unread',
  },
};

/**
 * Notification with a timestamp showing relative time.
 */
export const WithTimestamp: Story = {
  render: (args) => (
    <div className="w-full">
      <NotificationCard {...args} />
    </div>
  ),
  args: {
    id: '2',
    title: 'Task completed',
    body: 'Your task "Review design mockups" has been completed.',
    status: 'unread',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },
};

/**
 * Notification with actions. Actions can have different styles and types.
 */
export const WithActions: Story = {
  render: (args) => (
    <div className="w-full">
      <NotificationCard {...args} />
    </div>
  ),
  args: {
    id: '3',
    title: 'Payment required',
    body: 'Your subscription will expire in 3 days. Please update your payment method.',
    status: 'unread',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    actions: [
      {
        id: 'action-1',
        label: 'Update Payment',
        type: 'redirect',
        style: 'primary',
      },
      {
        id: 'action-2',
        label: 'Dismiss',
        type: 'api_call',
        style: 'default',
      },
    ],
  },
};

/**
 * Read notifications have a different visual style with reduced opacity.
 */
export const Read: Story = {
  render: (args) => (
    <div className="w-full">
      <NotificationCard {...args} />
    </div>
  ),
  args: {
    id: '4',
    title: 'System update',
    body: 'Your system has been updated to the latest version.',
    status: 'read',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
};

/**
 * Archived notifications are visually muted.
 */
export const Archived: Story = {
  render: (args) => (
    <div className="w-full">
      <NotificationCard {...args} />
    </div>
  ),
  args: {
    id: '5',
    title: 'Old notification',
    body: 'This is an archived notification.',
    status: 'archived',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
};

/**
 * Different action types: redirect, api_call, workflow, and modal.
 */
export const ActionTypes: Story = {
  render: () => (
    <div className="w-full">
      <NotificationCard
        id="redirect"
        title="Action Types Example"
        body="This notification demonstrates different action types."
        status="unread"
        createdAt={new Date()}
        actions={[
          {
            id: 'redirect',
            label: 'View Details',
            type: 'redirect',
            style: 'primary',
          },
          {
            id: 'api',
            label: 'Approve',
            type: 'api_call',
            style: 'default',
          },
          {
            id: 'workflow',
            label: 'Start Workflow',
            type: 'workflow',
            style: 'default',
          },
          {
            id: 'modal',
            label: 'Show Info',
            type: 'modal',
            style: 'default',
          },
        ]}
      />
    </div>
  ),
};

/**
 * Action styles: primary, danger, and default.
 */
export const ActionStyles: Story = {
  render: () => (
    <div className="w-full">
      <NotificationCard
        id="styles"
        title="Action Styles Example"
        body="This notification shows different action button styles."
        status="unread"
        createdAt={new Date()}
        actions={[
          {
            id: 'primary',
            label: 'Primary Action',
            type: 'api_call',
            style: 'primary',
          },
          {
            id: 'danger',
            label: 'Delete',
            type: 'api_call',
            style: 'danger',
          },
          {
            id: 'default',
            label: 'Default Action',
            type: 'api_call',
            style: 'default',
          },
        ]}
      />
    </div>
  ),
};

/**
 * Interactive example showing loading states and executed actions.
 */
export const Interactive: Story = {
  render: () => {
    const [notifications, setNotifications] = useState<
      (NotificationCardProps & { read: boolean })[]
    >([
      {
        id: '1',
        title: 'New comment on your post',
        body: 'Sarah commented on your recent post. Click to view the conversation.',
        status: 'unread',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
        actions: [
          {
            id: 'view',
            label: 'View Comment',
            type: 'redirect',
            style: 'primary',
          },
          {
            id: 'dismiss',
            label: 'Dismiss',
            type: 'api_call',
            style: 'default',
          },
        ],
      },
      {
        id: '2',
        title: 'Document shared with you',
        body: 'John shared "Project Plan.pdf" with you. You now have access.',
        status: 'unread',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        read: false,
        actions: [
          {
            id: 'open',
            label: 'Open Document',
            type: 'redirect',
            style: 'primary',
          },
        ],
      },
    ])

    const [loadingActionId, setLoadingActionId] = useState<string | undefined>()
    const [executedActions, setExecutedActions] = useState<Set<string>>(new Set())

    const handleMarkAsRead = (id: string) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true, status: 'read' as const } : notif
        )
      )
    }

    const handleAction = (
      notificationId: string,
      actionId: string,
      actionType: string,
    ) => {
      const actionKey = `${notificationId}-${actionId}`
      setLoadingActionId(actionId)

      // Simulate API call
      setTimeout(() => {
        setLoadingActionId(undefined)
        setExecutedActions((prev) => new Set(prev).add(actionKey))

        // Update action executed state
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            actions: notif.actions?.map((action) =>
              action.id === actionId
                ? { ...action, executed: true }
                : action,
            ),
          })),
        )

        console.log('Action executed:', { notificationId, actionId, actionType })
      }, 1500)
    }

    return (
      <div className="space-y-3 w-full">
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Click "Mark as read" to change status. Click actions to see loading
            and executed states.
          </p>
        </div>
        {notifications.map((notif) => (
          <NotificationCard
            key={notif.id}
            {...notif}
            onMarkAsRead={handleMarkAsRead}
            onAction={handleAction}
            loadingActionId={loadingActionId}
          />
        ))}
      </div>
    )
  },
};

/**
 * Different timestamp formats showing relative time calculations.
 */
export const TimestampFormats: Story = {
  render: () => {
    const now = new Date()

    return (
      <div className="space-y-3 w-full">
        <NotificationCard
          id="just-now"
          title="Just now"
          body="This notification was created just now"
          status="unread"
          createdAt={new Date(now.getTime() - 30 * 1000)}
        />
        <NotificationCard
          id="minutes"
          title="Minutes ago"
          body="This notification was created 45 minutes ago"
          status="unread"
          createdAt={new Date(now.getTime() - 45 * 60 * 1000)}
        />
        <NotificationCard
          id="hours"
          title="Hours ago"
          body="This notification was created 3 hours ago"
          status="unread"
          createdAt={new Date(now.getTime() - 3 * 60 * 60 * 1000)}
        />
        <NotificationCard
          id="days"
          title="Days ago"
          body="This notification was created 3 days ago"
          status="unread"
          createdAt={new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)}
        />
        <NotificationCard
          id="week"
          title="Over a week"
          body="This notification was created over a week ago"
          status="read"
          createdAt={new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)}
        />
      </div>
    )
  },
};

/**
 * Complete example with all features: unread status, actions, timestamp, and mark as read functionality.
 */
export const Complete: Story = {
  render: () => {
    const [read, setRead] = useState(false)

    return (
      <div className="w-full">
        <NotificationCard
          id="complete"
          title="Project invitation"
          body="You've been invited to collaborate on the 'Q4 Marketing Campaign' project. Accept the invitation to get started."
          status={read ? 'read' : 'unread'}
          createdAt={new Date(Date.now() - 1 * 60 * 60 * 1000)}
          actions={[
            {
              id: 'accept',
              label: 'Accept',
              type: 'api_call',
              style: 'primary',
            },
            {
              id: 'decline',
              label: 'Decline',
              type: 'api_call',
              style: 'danger',
            },
            {
              id: 'view',
              label: 'View Project',
              type: 'redirect',
              style: 'default',
            },
          ]}
          onMarkAsRead={() => setRead(true)}
          onAction={(id, actionId, actionType) => {
            console.log('Action clicked:', { id, actionId, actionType })
          }}
        />
      </div>
    )
  },
};
