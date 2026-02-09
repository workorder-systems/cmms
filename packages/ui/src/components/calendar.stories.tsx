import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Calendar } from './calendar';

const meta = {
  title: 'Forms/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic calendar component for date selection.
 * Uses react-day-picker under the hood with custom styling.
 */
export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

/**
 * Calendar with date range selection.
 */
export const DateRange: Story = {
  render: () => {
    const [dateRange, setDateRange] = React.useState<
      { from: Date | undefined; to: Date | undefined } | undefined
    >({
      from: new Date(),
      to: undefined,
    });

    return (
      <Calendar
        mode="range"
        selected={dateRange}
        onSelect={setDateRange}
        numberOfMonths={2}
        className="rounded-md border"
      />
    );
  },
};

/**
 * Calendar with multiple date selection.
 */
export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = React.useState<Date[] | undefined>([]);

    return (
      <Calendar
        mode="multiple"
        selected={dates}
        onSelect={setDates}
        className="rounded-md border"
      />
    );
  },
};

/**
 * Calendar with dropdown month/year selection.
 */
export const WithDropdowns: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        captionLayout="dropdown"
        fromYear={2020}
        toYear={2030}
        className="rounded-md border"
      />
    );
  },
};

/**
 * Calendar with disabled dates.
 */
export const WithDisabledDates: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    const disabledDates = [
      new Date(2024, 0, 1), // New Year's Day
      new Date(2024, 6, 4), // July 4th
      new Date(2024, 11, 25), // Christmas
    ];

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={disabledDates}
        className="rounded-md border"
      />
    );
  },
};

/**
 * Calendar with custom button variant.
 */
export const CustomButtonVariant: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        buttonVariant="outline"
        className="rounded-md border"
      />
    );
  },
};
