import type { Meta, StoryObj } from '@storybook/react';
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyTable,
  TypographyTHead,
  TypographyTBody,
  TypographyTR,
  TypographyTD,
  TypographyTH,
  TypographyList,
  TypographyOrderedList,
  TypographyListItem,
  TypographyCode,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
} from './typography';

const meta = {
  title: 'Primitives/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Typography components for headings, paragraphs, lists, and other text elements. These components use utility classes to style text consistently.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Heading 1 - Used for main page titles
 */
export const H1: Story = {
  render: () => (
    <TypographyH1>The Joke Tax Chronicles</TypographyH1>
  ),
};

/**
 * Heading 2 - Used for section titles
 */
export const H2: Story = {
  render: () => (
    <TypographyH2>The People of the Kingdom</TypographyH2>
  ),
};

/**
 * Heading 3 - Used for subsection titles
 */
export const H3: Story = {
  render: () => (
    <TypographyH3>The Joke Tax</TypographyH3>
  ),
};

/**
 * Heading 4 - Used for smaller subsection titles
 */
export const H4: Story = {
  render: () => (
    <TypographyH4>People stopped telling jokes</TypographyH4>
  ),
};

/**
 * Paragraph - Standard body text
 */
export const P: Story = {
  render: () => (
    <TypographyP>
      The king, seeing how much happier his subjects were, realized the error of
      his ways and repealed the joke tax.
    </TypographyP>
  ),
};

/**
 * Blockquote - For quoted text
 */
export const Blockquote: Story = {
  render: () => (
    <TypographyBlockquote>
      "After all," he said, "everyone enjoys a good joke, so it's only fair that
      they should pay for the privilege."
    </TypographyBlockquote>
  ),
};

/**
 * Table - For tabular data
 */
export const Table: Story = {
  render: () => (
    <TypographyTable>
      <TypographyTHead>
        <TypographyTR>
          <TypographyTH>King's Treasury</TypographyTH>
          <TypographyTH align="right">People's happiness</TypographyTH>
        </TypographyTR>
      </TypographyTHead>
      <TypographyTBody>
        <TypographyTR>
          <TypographyTD>Empty</TypographyTD>
          <TypographyTD align="right">Overflowing</TypographyTD>
        </TypographyTR>
        <TypographyTR>
          <TypographyTD>Modest</TypographyTD>
          <TypographyTD align="right">Satisfied</TypographyTD>
        </TypographyTR>
        <TypographyTR>
          <TypographyTD>Full</TypographyTD>
          <TypographyTD align="right">Ecstatic</TypographyTD>
        </TypographyTR>
      </TypographyTBody>
    </TypographyTable>
  ),
};

/**
 * List - Unordered list
 */
export const List: Story = {
  render: () => (
    <TypographyList>
      <TypographyListItem>1st level of puns: 5 gold coins</TypographyListItem>
      <TypographyListItem>2nd level of jokes: 10 gold coins</TypographyListItem>
      <TypographyListItem>3rd level of one-liners: 20 gold coins</TypographyListItem>
    </TypographyList>
  ),
};

/**
 * Ordered List - Numbered list
 */
export const OrderedList: Story = {
  render: () => (
    <TypographyOrderedList>
      <TypographyListItem>1st level of puns: 5 gold coins</TypographyListItem>
      <TypographyListItem>2nd level of jokes: 10 gold coins</TypographyListItem>
      <TypographyListItem>3rd level of one-liners: 20 gold coins</TypographyListItem>
    </TypographyOrderedList>
  ),
};

/**
 * Inline Code - For code snippets within text
 */
export const InlineCode: Story = {
  render: () => (
    <TypographyP>
      The king learned that <TypographyCode>jokeTax()</TypographyCode> was not
      the best way to increase revenue.
    </TypographyP>
  ),
};

/**
 * Lead - For introductory text
 */
export const Lead: Story = {
  render: () => (
    <TypographyLead>
      A modal dialog that interrupts the user with important content and expects
      a response.
    </TypographyLead>
  ),
};

/**
 * Large - For larger text
 */
export const Large: Story = {
  render: () => (
    <TypographyLarge>Are you absolutely sure?</TypographyLarge>
  ),
};

/**
 * Small - For smaller text
 */
export const Small: Story = {
  render: () => (
    <TypographySmall>Email address</TypographySmall>
  ),
};

/**
 * Muted - For secondary text
 */
export const Muted: Story = {
  render: () => (
    <TypographyMuted>
      Enter your email address.
    </TypographyMuted>
  ),
};

/**
 * Complete Typography Demo - Shows all typography components together
 */
export const Demo: Story = {
  render: () => (
    <div className="space-y-6">
      <TypographyH1>Taxing Laughter: The Joke Tax Chronicles</TypographyH1>
      <TypographyLead>
        Once upon a time, in a far-off land, there was a very lazy king who
        spent all day lounging on his throne. One day, his advisors came to him
        with a problem: the kingdom was running out of money.
      </TypographyLead>
      <TypographyH2>The King's Plan</TypographyH2>
      <TypographyP>
        The king thought long and hard, and finally came up with{' '}
        <TypographyCode>a brilliant plan</TypographyCode>: he would tax the
        jokes in the kingdom.
      </TypographyP>
      <TypographyBlockquote>
        "After all," he said, "everyone enjoys a good joke, so it's only fair
        that they should pay for the privilege."
      </TypographyBlockquote>
      <TypographyH3>The Joke Tax</TypographyH3>
      <TypographyP>
        The king's subjects were not amused. They grumbled and complained, but
        the king was not swayed. He issued a royal decree and posted it in every
        town square:
      </TypographyP>
      <TypographyList>
        <TypographyListItem>1st level of puns: 5 gold coins</TypographyListItem>
        <TypographyListItem>2nd level of jokes: 10 gold coins</TypographyListItem>
        <TypographyListItem>3rd level of one-liners: 20 gold coins</TypographyListItem>
      </TypographyList>
      <TypographyH4>People stopped telling jokes</TypographyH4>
      <TypographyP>
        As a result, people stopped telling jokes, and the kingdom fell into a
        dark, humorless age.
      </TypographyP>
      <TypographyTable>
        <TypographyTHead>
          <TypographyTR>
            <TypographyTH>King's Treasury</TypographyTH>
            <TypographyTH align="right">People's happiness</TypographyTH>
          </TypographyTR>
        </TypographyTHead>
        <TypographyTBody>
          <TypographyTR>
            <TypographyTD>Empty</TypographyTD>
            <TypographyTD align="right">Overflowing</TypographyTD>
          </TypographyTR>
          <TypographyTR>
            <TypographyTD>Modest</TypographyTD>
            <TypographyTD align="right">Satisfied</TypographyTD>
          </TypographyTR>
          <TypographyTR>
            <TypographyTD>Full</TypographyTD>
            <TypographyTD align="right">Ecstatic</TypographyTD>
          </TypographyTR>
        </TypographyTBody>
      </TypographyTable>
      <TypographyP>
        The king, seeing how much happier his subjects were, realized the error
        of his ways and repealed the joke tax.
      </TypographyP>
    </div>
  ),
};
