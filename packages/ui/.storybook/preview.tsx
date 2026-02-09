import type { Preview } from '@storybook/react';
import * as React from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Primitives',
          'Forms',
          'Overlay',
          'Layout',
          'Navigation',
          'Data',
          'Feedback',
          'Patterns',
          'Examples',
        ],
      },
    },
  },
  decorators: [
    // Use the React adapter for nuqs in Storybook
    // This provides in-memory state management without needing a Next.js router
    (Story) => (
      <NuqsAdapter>
        <Story />
      </NuqsAdapter>
    ),
  ],
};

export default preview;
