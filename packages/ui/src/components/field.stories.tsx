import type { Meta, StoryObj } from '@storybook/react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from './field';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta = {
  title: 'Forms/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Field component provides a structured way to build form fields with labels,
 * descriptions, and error messages. It supports vertical and horizontal layouts.
 */
export const Default: Story = {
  render: () => (
    <FieldGroup className="w-[350px]">
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldContent>
          <Input type="email" placeholder="john@example.com" />
          <FieldDescription>
            Enter your email address.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <FieldGroup className="w-[350px]">
      <Field orientation="horizontal">
        <FieldLabel>Email</FieldLabel>
        <FieldContent>
          <Input type="email" placeholder="john@example.com" />
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <FieldGroup className="w-[350px]">
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldContent>
          <Input type="email" placeholder="john@example.com" aria-invalid="true" />
          <FieldError>Please enter a valid email address.</FieldError>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};

export const WithFieldSet: Story = {
  render: () => (
    <FieldSet className="w-[350px]">
      <FieldLegend>Account Information</FieldLegend>
      <Field>
        <FieldLabel>Username</FieldLabel>
        <FieldContent>
          <Input placeholder="johndoe" />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldContent>
          <Input type="email" placeholder="john@example.com" />
        </FieldContent>
      </Field>
    </FieldSet>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <FieldGroup className="w-[350px]">
      <Field>
        <FieldLabel>
          <Checkbox />
          <span>I agree to the terms and conditions</span>
        </FieldLabel>
        <FieldDescription>
          You must accept the terms to continue.
        </FieldDescription>
      </Field>
    </FieldGroup>
  ),
};

export const WithRadioGroup: Story = {
  render: () => (
    <FieldGroup className="w-[350px]">
      <Field>
        <FieldLabel>Notification Preference</FieldLabel>
        <FieldContent>
          <RadioGroup defaultValue="email">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sms" id="sms" />
              <Label htmlFor="sms">SMS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">None</Label>
            </div>
          </RadioGroup>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
};
