import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TodoItem, type TodoItemProps } from './todo-item';

const meta = {
  title: 'Patterns/TodoItem',
  component: TodoItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A comprehensive todo item component with support for priorities, labels, projects, due dates, and subtasks. Fully customizable and accessible.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    priority: {
      control: 'select',
      options: ['high', 'medium', 'low', 'none'],
      description: 'Priority level of the todo item',
    },
    completed: {
      control: 'boolean',
      description: 'Whether the todo item is completed',
    },
    isSelected: {
      control: 'boolean',
      description: 'Whether the todo item is currently selected',
    },
  },
} satisfies Meta<typeof TodoItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A basic todo item with just a title and completion state.
 */
export const Basic: Story = {
  args: {
    id: '1',
    title: 'Complete project documentation',
    completed: false,
    priority: 'none',
  },
};

/**
 * Todo item with a description providing more context.
 */
export const WithDescription: Story = {
  args: {
    id: '2',
    title: 'Review pull requests',
    description: 'Check all open PRs and provide feedback to team members',
    completed: false,
    priority: 'medium',
  },
};

/**
 * Todo items can have different priority levels: high, medium, low, or none.
 * Priority is indicated by a colored dot next to the title.
 */
export const Priorities: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <TodoItem
        id="high"
        title="Urgent: Fix critical bug"
        description="This needs immediate attention"
        completed={false}
        priority="high"
      />
      <TodoItem
        id="medium"
        title="Review design mockups"
        description="Check the latest design iterations"
        completed={false}
        priority="medium"
      />
      <TodoItem
        id="low"
        title="Update documentation"
        description="Add examples to the README"
        completed={false}
        priority="low"
      />
      <TodoItem
        id="none"
        title="General task"
        description="No specific priority assigned"
        completed={false}
        priority="none"
      />
    </div>
  ),
};

/**
 * Todo items can be associated with projects and have labels for organization.
 */
export const WithProjectAndLabels: Story = {
  args: {
    id: '3',
    title: 'Implement user authentication',
    description: 'Add login and signup functionality',
    completed: false,
    priority: 'high',
    project: {
      id: 'proj-1',
      name: 'Web App',
      color: '#3b82f6',
    },
    labels: [
      { id: 'label-1', name: 'Backend', color: '#ef4444' },
      { id: 'label-2', name: 'Security', color: '#10b981' },
    ],
  },
};

/**
 * Todo items can have due dates. Overdue dates are shown in red, today's date
 * is highlighted, and future dates are shown normally.
 */
export const WithDueDate: Story = {
  render: () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return (
      <div className="space-y-4 max-w-2xl">
        <TodoItem
          id="overdue"
          title="Overdue task"
          description="This task is past its due date"
          completed={false}
          priority="high"
          dueDate={yesterday}
        />
        <TodoItem
          id="today"
          title="Due today"
          description="This task is due today"
          completed={false}
          priority="medium"
          dueDate={today}
        />
        <TodoItem
          id="tomorrow"
          title="Due tomorrow"
          description="This task is due tomorrow"
          completed={false}
          priority="low"
          dueDate={tomorrow}
        />
        <TodoItem
          id="next-week"
          title="Due next week"
          description="This task is due in a week"
          completed={false}
          priority="none"
          dueDate={nextWeek}
        />
      </div>
    );
  },
};

/**
 * Todo items can have subtasks that can be tracked separately. Click the
 * subtask indicator to expand and see all subtasks.
 */
export const WithSubtasks: Story = {
  args: {
    id: '4',
    title: 'Launch new feature',
    description: 'Complete all steps for the feature launch',
    completed: false,
    priority: 'high',
    subtasks: [
      { id: 'sub-1', title: 'Write feature documentation', completed: true },
      { id: 'sub-2', title: 'Create unit tests', completed: true },
      { id: 'sub-3', title: 'Deploy to staging', completed: false },
      { id: 'sub-4', title: 'Run QA testing', completed: false },
    ],
  },
};

/**
 * Completed todo items are visually distinct with strikethrough text and
 * reduced opacity.
 */
export const Completed: Story = {
  args: {
    id: '5',
    title: 'Completed task',
    description: 'This task has been completed',
    completed: true,
    priority: 'medium',
    project: {
      id: 'proj-1',
      name: 'Completed Project',
    },
    labels: [{ id: 'label-1', name: 'Done' }],
  },
};

/**
 * Interactive example showing how todo items respond to user interactions.
 * Click the checkbox to toggle completion, or click the item to select it.
 */
export const Interactive: Story = {
  render: () => {
    const [todos, setTodos] = useState<TodoItemProps[]>([
      {
        id: '1',
        title: 'Design user interface',
        description: 'Create mockups for the new dashboard',
        completed: false,
        priority: 'high',
        project: { id: 'p1', name: 'Design', color: '#8b5cf6' },
        labels: [{ id: 'l1', name: 'UI/UX', color: '#ec4899' }],
      },
      {
        id: '2',
        title: 'Write API documentation',
        description: 'Document all endpoints and request/response formats',
        completed: false,
        priority: 'medium',
        project: { id: 'p2', name: 'Backend', color: '#3b82f6' },
        subtasks: [
          { id: 's1', title: 'List all endpoints', completed: true },
          { id: 's2', title: 'Add examples', completed: false },
        ],
      },
      {
        id: '3',
        title: 'Set up CI/CD pipeline',
        description: 'Configure automated testing and deployment',
        completed: true,
        priority: 'low',
      },
    ]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleToggleComplete = (id: string, completed: boolean) => {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      );
    };

    const handleClick = (id: string) => {
      setSelectedId(id === selectedId ? null : id);
    };

    return (
      <div className="space-y-3 max-w-2xl">
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Click checkboxes to toggle completion. Click items to select them.
            Selected item: {selectedId || 'None'}
          </p>
        </div>
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            {...todo}
            isSelected={selectedId === todo.id}
            onToggleComplete={handleToggleComplete}
            onClick={handleClick}
          />
        ))}
      </div>
    );
  },
};

/**
 * Complete example showing all features together: priority, project, labels,
 * due date, and subtasks.
 */
export const Complete: Story = {
  args: {
    id: 'complete',
    title: 'Launch version 2.0',
    description:
      'Complete all tasks required for the major version release including testing, documentation, and deployment',
    completed: false,
    priority: 'high',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    project: {
      id: 'proj-1',
      name: 'Product Launch',
      color: '#10b981',
    },
    labels: [
      { id: 'label-1', name: 'Release', color: '#f59e0b' },
      { id: 'label-2', name: 'Critical', color: '#ef4444' },
    ],
    subtasks: [
      { id: 'sub-1', title: 'Finalize feature list', completed: true },
      { id: 'sub-2', title: 'Complete testing', completed: true },
      { id: 'sub-3', title: 'Update documentation', completed: false },
      { id: 'sub-4', title: 'Prepare release notes', completed: false },
      { id: 'sub-5', title: 'Deploy to production', completed: false },
    ],
  },
};
