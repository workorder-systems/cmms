import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { TourProvider, useTour, type Tour } from './tour';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

const meta = {
  title: 'Patterns/Tour',
  component: TourProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TourProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleTour: Tour = {
  id: 'example-tour',
  steps: [
    {
      id: 'step-1',
      title: 'Welcome to the Tour',
      content: 'This is the first step. Click Next to continue.',
    },
    {
      id: 'step-2',
      title: 'Feature Overview',
      content: 'This is the second step showing another feature.',
    },
    {
      id: 'step-3',
      title: 'Final Step',
      content: 'This is the final step. Click Finish to complete the tour.',
    },
  ],
};

function TourDemo() {
  const { start } = useTour();

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => start('example-tour')}>Start Tour</Button>
      <div className="flex flex-col gap-4">
        <Card data-tour-step-id="step-1" className="w-[350px]">
          <CardHeader>
            <CardTitle>Feature 1</CardTitle>
            <CardDescription>This is the first feature</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This card is highlighted in step 1 of the tour.
            </p>
          </CardContent>
        </Card>
        <Card data-tour-step-id="step-2" className="w-[350px]">
          <CardHeader>
            <CardTitle>Feature 2</CardTitle>
            <CardDescription>This is the second feature</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This card is highlighted in step 2 of the tour.
            </p>
          </CardContent>
        </Card>
        <Card data-tour-step-id="step-3" className="w-[350px]">
          <CardHeader>
            <CardTitle>Feature 3</CardTitle>
            <CardDescription>This is the third feature</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This card is highlighted in step 3 of the tour.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * The Tour component provides a guided tour experience with step-by-step highlights.
 * Elements are targeted using the `data-tour-step-id` attribute.
 */
export const Default: Story = {
  render: () => (
    <TourProvider tours={[exampleTour]}>
      <TourDemo />
    </TourProvider>
  ),
};

const customPositionTour: Tour = {
  id: 'custom-position-tour',
  steps: [
    {
      id: 'step-1',
      title: 'Custom Position',
      content: 'This popover appears on the right side of the target element.',
      side: 'right',
      sideOffset: 10,
    },
    {
      id: 'step-2',
      title: 'Top Position',
      content: 'This popover appears above the target element.',
      side: 'top',
      align: 'start',
    },
  ],
};

/**
 * Tour steps can be positioned using the `side`, `align`, `sideOffset`, and `alignOffset` properties.
 */
export const CustomPosition: Story = {
  render: () => {
    function CustomTourDemo() {
      const { start } = useTour();
      return (
        <div className="flex flex-col gap-4">
          <Button onClick={() => start('custom-position-tour')}>Start Custom Position Tour</Button>
          <div className="flex flex-col gap-4">
            <Card data-tour-step-id="step-1" className="w-[350px]">
              <CardHeader>
                <CardTitle>Right Side</CardTitle>
                <CardDescription>Popover appears on the right</CardDescription>
              </CardHeader>
            </Card>
            <Card data-tour-step-id="step-2" className="w-[350px]">
              <CardHeader>
                <CardTitle>Top Position</CardTitle>
                <CardDescription>Popover appears on top</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <TourProvider tours={[customPositionTour]}>
        <CustomTourDemo />
      </TourProvider>
    );
  },
};

const singleStepTour: Tour = {
  id: 'single-step-tour',
  steps: [
    {
      id: 'step-1',
      title: 'Single Step Tour',
      content: 'This is a simple tour with just one step.',
    },
  ],
};

/**
 * A tour can have a single step for simple introductions.
 */
export const SingleStep: Story = {
  render: () => {
    function SingleStepDemo() {
      const { start } = useTour();
      return (
        <div className="flex flex-col gap-4">
          <Button onClick={() => start('single-step-tour')}>Start Single Step Tour</Button>
          <Card data-tour-step-id="step-1" className="w-[350px]">
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>A simple one-step introduction</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card will be highlighted when you start the tour.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <TourProvider tours={[singleStepTour]}>
        <SingleStepDemo />
      </TourProvider>
    );
  },
};
