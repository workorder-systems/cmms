import type { Meta, StoryObj } from '@storybook/react';
import { Sparkline } from './sparkline';

const meta = {
  title: 'Data/Sparkline',
  component: Sparkline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A lightweight sparkline chart component for displaying trends in small spaces. Perfect for inline use in text, tables, or cards.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'area', 'bar'],
      description: 'Chart variant type',
    },
    curve: {
      control: 'select',
      options: ['linear', 'smooth'],
      description: 'Line curve type',
    },
    showDots: {
      control: 'boolean',
      description: 'Show data point dots',
    },
    showGradient: {
      control: 'boolean',
      description: 'Show gradient fill (area variant only)',
    },
  },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data sets
const ascendingData = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const descendingData = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5]
const volatileData = [20, 45, 15, 50, 10, 40, 25, 35, 30, 20]
const stableData = [30, 31, 29, 30, 31, 30, 29, 30, 31, 30]
const spikeData = [20, 22, 25, 80, 85, 25, 22, 20, 18, 20]

/**
 * Basic line sparkline showing an upward trend.
 */
export const Line: Story = {
  args: {
    data: ascendingData,
    variant: 'line',
    width: 100,
    height: 30,
  },
};

/**
 * Area sparkline with gradient fill showing a trend.
 */
export const Area: Story = {
  args: {
    data: ascendingData,
    variant: 'area',
    width: 100,
    height: 30,
    showGradient: true,
  },
};

/**
 * Bar sparkline showing data as bars.
 */
export const Bar: Story = {
  args: {
    data: ascendingData,
    variant: 'bar',
    width: 100,
    height: 30,
  },
};

/**
 * Line sparkline with dots showing data points.
 */
export const WithDots: Story = {
  args: {
    data: volatileData,
    variant: 'line',
    width: 100,
    height: 30,
    showDots: true,
  },
};

/**
 * Linear curve (straight lines between points).
 */
export const LinearCurve: Story = {
  args: {
    data: volatileData,
    variant: 'line',
    width: 100,
    height: 30,
    curve: 'linear',
  },
};

/**
 * Smooth curve (default, uses bezier curves).
 */
export const SmoothCurve: Story = {
  args: {
    data: volatileData,
    variant: 'line',
    width: 100,
    height: 30,
    curve: 'smooth',
  },
};

/**
 * Different trend patterns: ascending, descending, volatile, stable, and spike.
 */
export const TrendPatterns: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ascending Trend</h3>
        <Sparkline data={ascendingData} width={200} height={40} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Descending Trend</h3>
        <Sparkline data={descendingData} width={200} height={40} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Volatile Data</h3>
        <Sparkline data={volatileData} width={200} height={40} showDots />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Stable Data</h3>
        <Sparkline data={stableData} width={200} height={40} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Spike Pattern</h3>
        <Sparkline data={spikeData} width={200} height={40} variant="area" showGradient />
      </div>
    </div>
  ),
};

/**
 * Different sizes for various use cases.
 */
export const Sizes: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Small (60x20)</h3>
        <Sparkline data={ascendingData} width={60} height={20} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Medium (100x30) - Default</h3>
        <Sparkline data={ascendingData} width={100} height={30} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Large (200x50)</h3>
        <Sparkline data={ascendingData} width={200} height={50} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Wide (300x40)</h3>
        <Sparkline data={ascendingData} width={300} height={40} />
      </div>
    </div>
  ),
};

/**
 * Custom colors using theme colors or custom values.
 */
export const CustomColors: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Primary Color</h3>
        <Sparkline data={ascendingData} width={150} height={40} color="hsl(var(--primary))" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Green (Success)</h3>
        <Sparkline data={ascendingData} width={150} height={40} color="#10b981" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Red (Danger)</h3>
        <Sparkline data={descendingData} width={150} height={40} color="#ef4444" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Blue</h3>
        <Sparkline data={volatileData} width={150} height={40} color="#3b82f6" variant="area" showGradient />
      </div>
    </div>
  ),
};

/**
 * Inline usage examples showing how sparklines can be embedded in text or tables.
 */
export const InlineUsage: Story = {
  render: () => (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">In Text</h3>
        <p className="text-sm">
          Sales trend{' '}
          <Sparkline data={ascendingData} width={80} height={20} className="inline-block align-middle mx-1" />{' '}
          shows steady growth this quarter.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">In Table</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Value</th>
                <th className="px-4 py-2 text-left">Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Revenue</td>
                <td className="px-4 py-2 font-medium">$45,230</td>
                <td className="px-4 py-2">
                  <Sparkline data={ascendingData} width={60} height={20} />
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Users</td>
                <td className="px-4 py-2 font-medium">1,234</td>
                <td className="px-4 py-2">
                  <Sparkline data={volatileData} width={60} height={20} />
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Engagement</td>
                <td className="px-4 py-2 font-medium">89%</td>
                <td className="px-4 py-2">
                  <Sparkline data={stableData} width={60} height={20} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">In Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">$12,345</div>
            <Sparkline data={ascendingData} width={100} height={30} />
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Active Users</div>
            <div className="text-2xl font-bold">8,901</div>
            <Sparkline data={volatileData} width={100} height={30} variant="area" showGradient />
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Conversion</div>
            <div className="text-2xl font-bold">3.2%</div>
            <Sparkline data={stableData} width={100} height={30} variant="bar" />
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * All variants side by side for comparison.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Line</h3>
        <Sparkline data={volatileData} width={200} height={40} variant="line" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Area</h3>
        <Sparkline data={volatileData} width={200} height={40} variant="area" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Area with Gradient</h3>
        <Sparkline data={volatileData} width={200} height={40} variant="area" showGradient />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Bar</h3>
        <Sparkline data={volatileData} width={200} height={40} variant="bar" />
      </div>
    </div>
  ),
};
