import nextra from 'nextra';

// Configure Nextra for docs, using the Nextra Docs Theme.
const withNextra = nextra({
  // You can add Nextra-specific options here (e.g. mdxOptions) later if needed.
});

// Export the Next.js config wrapped with Nextra.
export default withNextra({
  reactStrictMode: true,
});

