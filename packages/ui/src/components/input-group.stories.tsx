import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './input-group';
import { Search, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const meta = {
  title: 'Forms/InputGroup',
  component: InputGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Input Group component combines an input with addons like icons or buttons.
 * It provides a unified styling and focus management for grouped inputs.
 */
export const Default: Story = {
  render: () => (
    <InputGroup className="w-[350px]">
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <Mail className="h-4 w-4" />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput type="email" placeholder="Email" />
    </InputGroup>
  ),
};

export const WithSuffix: Story = {
  render: () => (
    <InputGroup className="w-[350px]">
      <InputGroupInput type="search" placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>
          <Search className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithPrefixAndSuffix: Story = {
  render: () => (
    <InputGroup className="w-[350px]">
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <Lock className="h-4 w-4" />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput type="password" placeholder="Password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>
          <Eye className="h-4 w-4" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithTextPrefix: Story = {
  render: () => (
    <InputGroup className="w-[350px]">
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
};

export const PasswordToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <InputGroup className="w-[350px]">
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <Lock className="h-4 w-4" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
  },
};
