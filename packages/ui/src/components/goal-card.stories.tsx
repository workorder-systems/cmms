import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { GoalCard, type GoalCardProps } from './goal-card';

const meta = {
  title: 'Patterns/GoalCard',
  component: GoalCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A goal card component that displays goal progress with status badges, step tracking, and roadmap support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    progress: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      description: 'Progress percentage (0-100)',
    },
  },
} satisfies Meta<typeof GoalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A basic goal card with title and progress.
 */
export const Basic: Story = {
  args: {
    id: '1',
    title: 'Complete project documentation',
    progress: 45,
  },
};

/**
 * Goal card with a creation date.
 */
export const WithDate: Story = {
  args: {
    id: '2',
    title: 'Launch new feature',
    progress: 75,
    createdAt: new Date(),
  },
};

/**
 * Goal card with roadmap steps showing progress tracking.
 */
export const WithRoadmap: Story = {
  args: {
    id: '3',
    title: 'Build mobile app',
    progress: 60,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    roadmap: {
      title: 'Build mobile app',
      nodes: [
        { id: '1', title: 'Design mockups', isComplete: true },
        { id: '2', title: 'Set up development environment', isComplete: true },
        { id: '3', title: 'Implement core features', isComplete: true },
        { id: '4', title: 'Testing and QA', isComplete: false },
        { id: '5', title: 'Deploy to app stores', isComplete: false },
      ],
    },
  },
};

/**
 * Completed goal showing 100% progress.
 */
export const Completed: Story = {
  args: {
    id: '4',
    title: 'Learn TypeScript',
    progress: 100,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    roadmap: {
      title: 'Learn TypeScript',
      nodes: [
        { id: '1', title: 'Read documentation', isComplete: true },
        { id: '2', title: 'Complete tutorials', isComplete: true },
        { id: '3', title: 'Build practice project', isComplete: true },
      ],
    },
  },
};

/**
 * Not started goal with 0% progress.
 */
export const NotStarted: Story = {
  args: {
    id: '5',
    title: 'Write blog post',
    progress: 0,
    createdAt: new Date(),
    roadmap: {
      title: 'Write blog post',
      nodes: [
        { id: '1', title: 'Research topic', isComplete: false },
        { id: '2', title: 'Create outline', isComplete: false },
        { id: '3', title: 'Write first draft', isComplete: false },
        { id: '4', title: 'Edit and revise', isComplete: false },
        { id: '5', title: 'Publish', isComplete: false },
      ],
    },
  },
};

/**
 * Goal in progress showing active work.
 */
export const InProgress: Story = {
  args: {
    id: '6',
    title: 'Redesign website',
    progress: 35,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    roadmap: {
      title: 'Redesign website',
      nodes: [
        { id: '1', title: 'Create wireframes', isComplete: true },
        { id: '2', title: 'Design new UI', isComplete: true },
        { id: '3', title: 'Implement frontend', isComplete: false },
        { id: '4', title: 'Update backend APIs', isComplete: false },
        { id: '5', title: 'Deploy to production', isComplete: false },
      ],
    },
  },
};

/**
 * Interactive example showing click and delete functionality.
 */
export const Interactive: Story = {
  render: () => {
    const [goals, setGoals] = useState<GoalCardProps[]>([
      {
        id: '1',
        title: 'Complete Q4 goals',
        progress: 65,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        roadmap: {
          title: 'Complete Q4 goals',
          nodes: [
            { id: '1', title: 'Goal 1', isComplete: true },
            { id: '2', title: 'Goal 2', isComplete: true },
            { id: '3', title: 'Goal 3', isComplete: true },
            { id: '4', title: 'Goal 4', isComplete: false },
            { id: '5', title: 'Goal 5', isComplete: false },
          ],
        },
      },
      {
        id: '2',
        title: 'Learn new framework',
        progress: 30,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        roadmap: {
          title: 'Learn new framework',
          nodes: [
            { id: '1', title: 'Read docs', isComplete: true },
            { id: '2', title: 'Build tutorial app', isComplete: false },
            { id: '3', title: 'Build real project', isComplete: false },
          ],
        },
      },
      {
        id: '3',
        title: 'Improve code quality',
        progress: 80,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    ])

    const handleClick = (id: string) => {
      console.log('Goal clicked:', id)
      alert(`Opening goal: ${id}`)
    }

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this goal?')) {
        setGoals((prev) => prev.filter((goal) => goal.id !== id))
        console.log('Goal deleted:', id)
      }
    }

    return (
      <div className="w-full space-y-3">
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Click a goal card to view it. Hover over a goal to see the delete
            option. Click "View Goal" button or the card itself.
          </p>
        </div>
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            {...goal}
            onClick={handleClick}
            onDelete={handleDelete}
          />
        ))}
      </div>
    )
  },
};

/**
 * Multiple goals showing different statuses and progress levels.
 */
export const MultipleGoals: Story = {
  render: () => (
    <div className="w-full space-y-3">
      <GoalCard
        id="1"
        title="Not Started Goal"
        progress={0}
        createdAt={new Date()}
        roadmap={{
          title: 'Not Started Goal',
          nodes: [
            { id: '1', title: 'Step 1', isComplete: false },
            { id: '2', title: 'Step 2', isComplete: false },
          ],
        }}
      />
      <GoalCard
        id="2"
        title="In Progress Goal"
        progress={45}
        createdAt={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        roadmap={{
          title: 'In Progress Goal',
          nodes: [
            { id: '1', title: 'Step 1', isComplete: true },
            { id: '2', title: 'Step 2', isComplete: true },
            { id: '3', title: 'Step 3', isComplete: false },
            { id: '4', title: 'Step 4', isComplete: false },
          ],
        }}
      />
      <GoalCard
        id="3"
        title="Completed Goal"
        progress={100}
        createdAt={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        roadmap={{
          title: 'Completed Goal',
          nodes: [
            { id: '1', title: 'Step 1', isComplete: true },
            { id: '2', title: 'Step 2', isComplete: true },
            { id: '3', title: 'Step 3', isComplete: true },
          ],
        }}
      />
    </div>
  ),
};

/**
 * Goal without roadmap, showing simple progress tracking.
 */
export const WithoutRoadmap: Story = {
  args: {
    id: '7',
    title: 'Simple goal without steps',
    progress: 50,
    createdAt: new Date(),
  },
};

/**
 * Complete example with all features: roadmap, date, click handler, and delete.
 */
export const Complete: Story = {
  render: () => {
    const [deleted, setDeleted] = useState(false)

    return (
      <div className="w-full">
        {!deleted && (
          <GoalCard
            id="complete"
            title="Complete Goal Example"
            progress={75}
            createdAt={new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)}
            roadmap={{
              title: 'Complete Goal Example',
              nodes: [
                { id: '1', title: 'Planning phase', isComplete: true },
                { id: '2', title: 'Development phase', isComplete: true },
                { id: '3', title: 'Testing phase', isComplete: true },
                { id: '4', title: 'Deployment phase', isComplete: false },
              ],
            }}
            onClick={(id) => {
              console.log('Goal clicked:', id)
            }}
            onDelete={(id) => {
              setDeleted(true)
              console.log('Goal deleted:', id)
            }}
          />
        )}
        {deleted && (
          <div className="p-4 text-center text-muted-foreground">
            Goal was deleted. Refresh to see it again.
          </div>
        )}
      </div>
    )
  },
};
