import type { Meta, StoryObj } from '@storybook/react';
import { Heatmap, type HeatmapData } from './heatmap';

const meta = {
  title: 'Data/Heatmap',
  component: Heatmap,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Heatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

// Generate sample data for the last 3 months
function generateSampleData(days: number): HeatmapData {
  const data: HeatmapData = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - i - 1));
    const dateStr = date.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      value: Math.floor(Math.random() * 20)
    });
  }
  
  return data;
}

const sampleData = generateSampleData(90);

/**
 * The Heatmap component displays activity data over time in a calendar-like grid.
 * It's commonly used for GitHub-style contribution graphs and activity tracking.
 */
export const Default: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();
    
    return (
      <Heatmap
        data={sampleData}
        startDate={startDate}
        endDate={endDate}
        colorMode="discrete"
        cellSize={12}
        gap={3}
      />
    );
  },
};

export const Interpolate: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();
    
    return (
      <Heatmap
        data={sampleData}
        startDate={startDate}
        endDate={endDate}
        colorMode="interpolate"
        minColor="#f0fdf4"
        maxColor="#166534"
        interpolation="linear"
        cellSize={12}
        gap={3}
      />
    );
  },
};

export const Bubbles: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();
    
    return (
      <Heatmap
        data={sampleData}
        startDate={startDate}
        endDate={endDate}
        colorMode="discrete"
        displayStyle="bubbles"
        cellSize={16}
        gap={4}
      />
    );
  },
};

export const AllDaysOfWeek: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();
    
    return (
      <Heatmap
        data={sampleData}
        startDate={startDate}
        endDate={endDate}
        colorMode="discrete"
        daysOfTheWeek="all"
        cellSize={12}
        gap={3}
      />
    );
  },
};

export const CustomColors: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const endDate = new Date();
    
    return (
      <Heatmap
        data={sampleData}
        startDate={startDate}
        endDate={endDate}
        colorMode="discrete"
        colorScale={['#fef2f2', '#fecaca', '#f87171', '#ef4444', '#dc2626']}
        cellSize={12}
        gap={3}
      />
    );
  },
};

export const Large: Story = {
  render: () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    const endDate = new Date();
    const yearData = generateSampleData(365);
    
    return (
      <Heatmap
        data={yearData}
        startDate={startDate}
        endDate={endDate}
        colorMode="discrete"
        cellSize={10}
        gap={2}
      />
    );
  },
};
