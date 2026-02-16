import type { Meta, StoryObj } from '@storybook/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';

const storyWrapperClassName =
  '@container/main min-h-[40vh] w-full px-4 py-6 lg:px-6';

const meta = {
  title: 'Data/StatCard',
  component: StatCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Metric card built from Card primitives. Header: label, value, trend badge, and optional sparkline. Footer: summary and description. Sparkline and background chart are mutually exclusive. Chart sits behind a gradient (z-0 → z-[1] overlay → z-10 content) for readability.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className={storyWrapperClassName}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'gradient'],
      description: 'Card visual variant',
    },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const ascendingData = [10, 15, 22, 28, 35, 42, 48, 55, 62, 70];
const volatileData = [20, 45, 15, 50, 10, 40, 25, 35, 30, 20];
const descendingData = [70, 62, 55, 48, 42, 35, 28, 22, 15, 10];

const storyGridClassName =
  'grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4';
const storyGrid3ClassName =
  'grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-3';

/**
 * Reference-style section cards: label, value, trend badge, footer summary + description.
 * Wrapped in @container/main with gradient so the grid responds to container breakpoints.
 */
export const SectionCardsStyle: Story = {
  render: () => (
    <div className={storyGridClassName}>
      <StatCard
        variant="gradient"
        label="Total Revenue"
        value="$1,250.00"
        trend={{ value: '+12.5%', direction: 'up' }}
        footerSummary={
          <>
            Trending up this month <TrendingUp className="size-4" />
          </>
        }
        footerDescription="Visitors for the last 6 months"
      />
      <StatCard
        variant="gradient"
        label="New Customers"
        value="1,234"
        trend={{ value: '-20%', direction: 'down' }}
        footerSummary={
          <>
            Down 20% this period <TrendingDown className="size-4" />
          </>
        }
        footerDescription="Acquisition needs attention"
      />
      <StatCard
        variant="gradient"
        label="Active Accounts"
        value="45,678"
        trend={{ value: '+12.5%', direction: 'up' }}
        footerSummary={
          <>
            Strong user retention <TrendingUp className="size-4" />
          </>
        }
        footerDescription="Engagement exceed targets"
      />
      <StatCard
        variant="gradient"
        label="Growth Rate"
        value="4.5%"
        trend={{ value: '+4.5%', direction: 'up' }}
        footerSummary={
          <>
            Steady performance increase <TrendingUp className="size-4" />
          </>
        }
        footerDescription="Meets growth projections"
      />
    </div>
  ),
};

/**
 * Single stat card with label, value, and trend badge.
 */
export const Basic: Story = {
  args: {
    label: 'Total Revenue',
    value: '$45,231',
    trend: '+12% from last month',
  },
};

/**
 * Trend with direction for automatic icon (up/down).
 */
export const TrendWithDirection: Story = {
  args: {
    label: 'New Customers',
    value: '1,234',
    trend: { value: '-20%', direction: 'down' },
    footerSummary: 'Down this period',
    footerDescription: 'Acquisition needs attention',
  },
};

/**
 * Minimal: value only.
 */
export const ValueOnly: Story = {
  args: {
    value: '8,901',
  },
};

/**
 * With footer summary and description.
 */
export const WithFooter: Story = {
  args: {
    label: 'Active users',
    value: '8,901',
    trend: { value: '+12%', direction: 'up' },
    footerSummary: 'Trending up this month',
    footerDescription: 'Users who logged in during the last 30 days.',
  },
};

/**
 * Sparkline on the right in the header action area.
 */
export const WithSparkline: Story = {
  args: {
    label: 'Revenue',
    value: '$12,345',
    trend: { value: '+8.2%', direction: 'up' },
    sparkline: {
      data: ascendingData,
      sparklineProps: { variant: 'area', showGradient: true },
    },
    footerDescription: 'Last 30 days',
  },
};

/**
 * Background chart only.
 */
export const WithBackgroundChart: Story = {
  args: {
    label: 'Conversions',
    value: '3.2%',
    trend: { value: '↑ 0.4%', direction: 'up' },
    footerDescription: 'Conversion rate this month',
    backgroundChart: { data: volatileData, variant: 'area' },
  },
};

/**
 * Grid with different content lengths. Uses @container/main + gradient.
 */
export const Grid: Story = {
  render: () => (
    <div className={storyGridClassName}>
      <StatCard
        label="Revenue"
        value="$45,231"
        trend={{ value: '+12%', direction: 'up' }}
        sparkline={{ data: ascendingData, sparklineProps: { variant: 'area', showGradient: true } }}
        footerDescription="vs last month"
      />
      <StatCard
        label="A very long label to show how the card behaves with more text"
        value="$1.2M"
        trend={{ value: '+120%', direction: 'up' }}
      />
      <StatCard
        label="Users"
        value="8,901"
        footerSummary="Active in last 30 days"
        footerDescription="Longer description to demonstrate wrapping and spacing in the footer."
        sparkline={{ data: volatileData, sparklineProps: { variant: 'line' } }}
      />
      <StatCard label="Short" value="99" />
      <StatCard
        label="Conversion rate"
        value="3.24%"
        trend={{ value: '↑ 0.4%', direction: 'up' }}
        footerDescription="Up from 2.84% last month."
        backgroundChart={{ data: ascendingData, variant: 'area' }}
      />
      <StatCard
        label="Orders"
        value="12,345"
        trend={{ value: '+56', direction: 'up' }}
        footerDescription="Total this month. All channels and regions."
        sparkline={{ data: descendingData, sparklineProps: { variant: 'bar' } }}
      />
    </div>
  ),
};

/**
 * Sparkline variants: line, area, bar. Uses @container/main + gradient.
 */
export const SparklineVariants: Story = {
  render: () => (
    <div className={storyGrid3ClassName}>
      <StatCard
        label="Line"
        value="$10k"
        trend={{ value: '+5%', direction: 'up' }}
        sparkline={{ data: volatileData, sparklineProps: { variant: 'line' } }}
      />
      <StatCard
        label="Area"
        value="$10k"
        trend={{ value: '+5%', direction: 'up' }}
        sparkline={{ data: volatileData, sparklineProps: { variant: 'area', showGradient: true } }}
      />
      <StatCard
        label="Bar"
        value="$10k"
        trend={{ value: '+5%', direction: 'up' }}
        sparkline={{ data: volatileData, sparklineProps: { variant: 'bar' } }}
      />
    </div>
  ),
};

/**
 * Background chart variants (chart behind gradient for readability).
 * Uses theme colors: --chart-1 (default), --chart-2, --chart-3.
 */
export const BackgroundChartVariants: Story = {
  render: () => (
    <div className={storyGrid3ClassName}>
      <StatCard
        label="Area background"
        value="1,234"
        backgroundChart={{ data: ascendingData, variant: 'area' }}
      />
      <StatCard
        label="Line background"
        value="1,234"
        backgroundChart={{
          data: ascendingData,
          variant: 'line',
          color: 'var(--chart-2)',
        }}
      />
      <StatCard
        label="Custom color"
        value="1,234"
        backgroundChart={{
          data: volatileData,
          variant: 'area',
          color: 'var(--chart-3)',
        }}
      />
    </div>
  ),
};
