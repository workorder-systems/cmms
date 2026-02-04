import { Layout } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: '@db/sdk Docs',
  description: 'Documentation for the Work Order Systems database SDK (@db/sdk).',
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Layout
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/workorder-systems/db/tree/main/docs-site"
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}

